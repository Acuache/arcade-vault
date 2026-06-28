'use client'

import { useEffect, useRef } from 'react'

interface SnakeGameProps {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void
  onLevel: (level: number) => void
  onGameOver: (finalScore: number) => void
}

export default function SnakeGame({
  paused,
  onScore,
  onLives,
  onLevel,
  onGameOver,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pausedRef = useRef<boolean>(paused)

  // Mantiene pausedRef sincronizado con el prop `paused` para que el loop
  // (que lee pausedRef.current dentro del requestAnimationFrame) nunca quede
  // con un valor obsoleto (stale closure).
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!
    if (!ctx) return

    // Dimensiones capturadas como números: el narrowing del guard de null no
    // alcanza a las funciones anidadas (closures), así que se leen aquí.
    const W = canvas.width
    const H = canvas.height

    // ── Constantes ──────────────────────────────────────────────────────────────────
    const CELL = 20
    const COLS = W / CELL // 30
    const ROWS = H / CELL // 30
    const GRID_LINE = '#1a1a2e'
    const BG = '#0a0a0f'
    const SNAKE_BODY = '#00ff88'
    const SNAKE_HEAD = '#7dffc0'
    const FOOD = '#ff006e'

    // ── Estado del juego (variables locales del useEffect) ──────────────────────────
    interface Cell {
      x: number
      y: number
    }

    let snake: Cell[]
    let dir: Cell
    let nextDir: Cell
    let food: Cell
    let score: number
    let level: number
    let eaten: number
    let gameOver: boolean
    let lastTime: number | null
    let moveAccum: number
    let moveInterval: number

    // Para emitir callbacks solo cuando el valor cambia (comparado cada frame).
    let prevScore = 0
    let prevLevel = 1
    let gameOverFired = false

    function speedForLevel(lvl: number): number {
      // Intervalo entre avances (ms): más bajo = más rápido. Mínimo 60 ms.
      return Math.max(60, 140 - (lvl - 1) * 12)
    }

    function spawnFood() {
      // Elige una celda libre (no ocupada por la serpiente).
      const free: Cell[] = []
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y })
        }
      }
      if (free.length === 0) return // tablero lleno (caso límite); no respawnea.
      food = free[Math.floor(Math.random() * free.length)]
    }

    function initGame() {
      const cx = Math.floor(COLS / 2)
      const cy = Math.floor(ROWS / 2)
      // Cabeza primero; arranca moviéndose a la derecha.
      snake = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
      ]
      dir = { x: 1, y: 0 }
      nextDir = { x: 1, y: 0 }
      score = 0
      level = 1
      eaten = 0
      gameOver = false
      moveInterval = speedForLevel(1)
      moveAccum = 0
      lastTime = null
      spawnFood()
    }

    function endGame() {
      if (gameOverFired) return
      gameOverFired = true
      gameOver = true
      onLives(0)
      onGameOver(score)
    }

    function step() {
      dir = nextDir
      const head = snake[0]
      const newHead: Cell = { x: head.x + dir.x, y: head.y + dir.y }

      // Colisión con la pared → muerte.
      if (
        newHead.x < 0 ||
        newHead.x >= COLS ||
        newHead.y < 0 ||
        newHead.y >= ROWS
      ) {
        endGame()
        return
      }

      const willEat = newHead.x === food.x && newHead.y === food.y
      // Si no come, la cola se libera este tick: se excluye del chequeo.
      const body = willEat ? snake : snake.slice(0, -1)
      if (body.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        endGame()
        return
      }

      snake.unshift(newHead)
      if (willEat) {
        score += 10
        eaten++
        level = Math.floor(eaten / 5) + 1
        moveInterval = speedForLevel(level)
        spawnFood()
      } else {
        snake.pop()
      }
    }

    // ── Dibujado ────────────────────────────────────────────────────────────────────
    function drawCell(cell: Cell, color: string) {
      ctx.fillStyle = color
      ctx.fillRect(cell.x * CELL + 1, cell.y * CELL + 1, CELL - 2, CELL - 2)
      // brillo superior (mismo idiom que TetrisGame).
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.fillRect(cell.x * CELL + 1, cell.y * CELL + 1, CELL - 2, 4)
    }

    function drawGrid() {
      ctx.strokeStyle = GRID_LINE
      ctx.lineWidth = 0.5
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath()
        ctx.moveTo(c * CELL, 0)
        ctx.lineTo(c * CELL, H)
        ctx.stroke()
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath()
        ctx.moveTo(0, r * CELL)
        ctx.lineTo(W, r * CELL)
        ctx.stroke()
      }
    }

    function draw() {
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, W, H)
      drawGrid()

      // Núcleo magenta con resplandor.
      ctx.save()
      ctx.shadowColor = FOOD
      ctx.shadowBlur = 12
      ctx.fillStyle = FOOD
      ctx.beginPath()
      ctx.arc(
        food.x * CELL + CELL / 2,
        food.y * CELL + CELL / 2,
        CELL / 2 - 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.restore()

      // Serpiente: la cabeza es más clara que el cuerpo.
      for (let i = snake.length - 1; i >= 0; i--) {
        drawCell(snake[i], i === 0 ? SNAKE_HEAD : SNAKE_BODY)
      }
    }

    // ── Controles de teclado ────────────────────────────────────────────────────────
    // preventDefault en flechas para no hacer scroll de la página.
    const GAME_KEYS = new Set([
      'ArrowLeft',
      'ArrowRight',
      'ArrowDown',
      'ArrowUp',
    ])
    const onKeyDown = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault()
      if (pausedRef.current || gameOver) return
      let nd: Cell | null = null
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          nd = { x: 0, y: -1 }
          break
        case 'ArrowDown':
        case 'KeyS':
          nd = { x: 0, y: 1 }
          break
        case 'ArrowLeft':
        case 'KeyA':
          nd = { x: -1, y: 0 }
          break
        case 'ArrowRight':
        case 'KeyD':
          nd = { x: 1, y: 0 }
          break
      }
      // Ignora el giro de 180° (no invertir directo sobre el eje actual).
      if (nd && !(nd.x === -dir.x && nd.y === -dir.y)) {
        nextDir = nd
      }
    }

    window.addEventListener('keydown', onKeyDown)

    // ── Loop principal ──────────────────────────────────────────────────────────────
    let rafId: number

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : ts - lastTime
      lastTime = ts

      // En pausa (o tras game over) se salta el avance, pero el tablero
      // sigue dibujándose.
      if (!pausedRef.current && !gameOver) {
        moveAccum += dt
        if (moveAccum >= moveInterval) {
          moveAccum = 0
          step()
        }
      }

      draw()

      if (score !== prevScore) {
        prevScore = score
        onScore(score)
      }
      if (level !== prevLevel) {
        prevLevel = level
        onLevel(level)
      }

      rafId = requestAnimationFrame(loop)
    }

    initGame()
    onLives(1) // Snake tiene una única vida.
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      style={{ display: 'block' }}
    />
  )
}

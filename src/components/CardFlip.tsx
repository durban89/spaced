import { useState } from 'react'

interface CardFlipProps {
  question: string
  answer: string
  onFlip?: () => void
}

export default function CardFlip({ question, answer, onFlip }: CardFlipProps) {
  const [flipped, setFlipped] = useState(false)

  const handleFlip = () => {
    setFlipped(!flipped)
    if (!flipped && onFlip) onFlip()
  }

  return (
    <div className="card-flip-container" onClick={handleFlip}>
      <div className={`card-flip ${flipped ? 'flipped' : ''}`}>
        <div className="card-front">
          <div className="card-label">Question</div>
          <div className="card-content">{question}</div>
          <div className="card-hint">Tap to reveal answer</div>
        </div>
        <div className="card-back">
          <div className="card-back-question">
            <div className="card-label">Question</div>
            <div className="card-back-question-text">{question}</div>
          </div>
          <div className="card-label">Answer</div>
          <div className="card-content">{answer}</div>
          <div className="card-hint">Tap to see question</div>
        </div>
      </div>
    </div>
  )
}

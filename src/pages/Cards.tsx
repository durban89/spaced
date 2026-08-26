import { useState, useEffect } from 'react'
import {
  getAllCards,
  getCardsByCategory,
  addCard,
  updateCard,
  deleteCard,
  getCategories,
} from '../db'
import { CATEGORY_PRESETS, type Card } from '../types'

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([])
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategory, setNewCategory] = useState(CATEGORY_PRESETS[0])
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const cats = await getCategories()
    setCategories(cats)
    const allCards = selectedCategory
      ? await getCardsByCategory(selectedCategory)
      : await getAllCards()
    setCards(allCards.sort((a, b) => b.updatedAt - a.updatedAt))
  }

  useEffect(() => {
    loadData()
  }, [selectedCategory])

  const handleAdd = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return
    await addCard({
      category: newCategory,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
    })
    setNewQuestion('')
    setNewAnswer('')
    setShowAddForm(false)
    loadData()
  }

  const handleEdit = (card: Card) => {
    setEditingId(card.id!)
    setEditQuestion(card.question)
    setEditAnswer(card.answer)
  }

  const handleSaveEdit = async () => {
    if (editingId === null) return
    await updateCard(editingId, {
      question: editQuestion.trim(),
      answer: editAnswer.trim(),
    })
    setEditingId(null)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this card?')) return
    await deleteCard(id)
    loadData()
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Cards</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add'}
        </button>
      </header>

      {showAddForm && (
        <div className="add-form">
          <div className="form-group">
            <label>Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {CATEGORY_PRESETS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Question</label>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter question..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Answer</label>
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Enter answer..."
              rows={3}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!newQuestion.trim() || !newAnswer.trim()}
          >
            Add
          </button>
        </div>
      )}

      <div className="category-filter">
        <button
          className={`filter-chip ${selectedCategory === '' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('')}
        >
          All ({categories.reduce((s, c) => s + c.count, 0)})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.name}
            className={`filter-chip ${selectedCategory === cat.name ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.name)}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      <div className="card-list">
        {cards.length === 0 ? (
          <div className="empty-state">
            <p>No cards yet</p>
            <p className="text-muted">Tap "+ Add" to create your first card</p>
          </div>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="card-item">
              {editingId === card.id ? (
                <div className="card-edit">
                  <textarea
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    rows={2}
                  />
                  <textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    rows={2}
                  />
                  <div className="card-actions">
                    <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>Save</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card-meta">
                    <span className="card-category">{card.category}</span>
                    <span className="card-level">Level {card.level}</span>
                  </div>
                  <div className="card-question">{card.question}</div>
                  <div className="card-answer">{card.answer}</div>
                  <div className="card-actions">
                    <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(card)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(card.id!)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

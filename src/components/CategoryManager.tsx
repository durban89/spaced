import { useEffect, useState } from 'react'
import {
  getCategoryList,
  saveCategoryList,
  renameCategory,
  deleteCategory,
} from '../db'

interface Props {
  onClose: () => void
  onChanged: () => void
}

export default function CategoryManager({ onClose, onChanged }: Props) {
  const [items, setItems] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    ;(async () => {
      setItems(await getCategoryList())
    })()
  }, [])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    const next = [...new Set([...items, name])]
    setItems(next)
    setNewName('')
    await saveCategoryList(next)
    onChanged()
  }

  const handleRename = async (oldName: string) => {
    const name = renameValue.trim()
    if (!name || name === oldName) return
    await renameCategory(oldName, name)
    setItems(await getCategoryList())
    setRenaming(null)
    onChanged()
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete category "${name}"? Existing cards keep their tag.`)) return
    await deleteCategory(name)
    setItems(await getCategoryList())
    onChanged()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Categories</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
        </div>

        <div className="category-add-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />
          <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={!newName.trim()}>
            Add
          </button>
        </div>

        <div className="category-manage-list">
          {items.map((name) => (
            <div key={name} className="category-manage-item">
              {renaming === name ? (
                <>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(name)
                    }}
                  />
                  <button className="btn btn-sm btn-primary" onClick={() => handleRename(name)}>Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setRenaming(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="category-manage-name">{name}</span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setRenaming(name)
                      setRenameValue(name)
                    }}
                  >
                    Rename
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(name)}>Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
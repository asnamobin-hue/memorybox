import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:8080'

function App() {
  const [query, setQuery] = useState('')
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [viewingMemory, setViewingMemory] = useState(null)

  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [userDescription, setUserDescription] = useState('')
  const [savingMemory, setSavingMemory] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [remarkMemoryId, setRemarkMemoryId] = useState(null)
  const [remarkText, setRemarkText] = useState('')
  const [actionError, setActionError] = useState('')

  const fileInputRef = useRef(null)

  useEffect(() => {
    async function loadMemories() {
      try {
        const response = await fetch(`${API_URL}/api/memories`)

        if (!response.ok) {
          throw new Error('Failed to load memories')
        }

        const data = await response.json()
        setMemories(data)
      } catch (error) {
        console.error('Failed to load memories:', error)
      }
    }

    loadMemories()
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setViewingMemory(null)
      }
    }

    if (viewingMemory) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewingMemory])

  function openMemoryViewer(memory) {
    setViewingMemory(memory)
  }

  function closeMemoryViewer() {
    setViewingMemory(null)
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setSaveError('Please choose a JPG, PNG, or WEBP image.')
      event.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setSaveError('The image must be 10 MB or smaller.')
      event.target.value = ''
      return
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    setSaveError('')
    setSelectedPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removeSelectedPhoto() {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    setSelectedPhoto(null)
    setPhotoPreview('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function closeAddMemory() {
    if (savingMemory) {
      return
    }

    removeSelectedPhoto()
    setUserDescription('')
    setSaveError('')
    setShowAddMemory(false)
  }

  async function waitForAiProcessing(memoryId) {
    const maxAttempts = 20
    const delay = 3000

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetch(
          `${API_URL}/api/memories/${memoryId}`
        )

        if (!response.ok) {
          return
        }

        const updatedMemory = await response.json()

        if (updatedMemory.aiCaption) {
          setMemories((currentMemories) =>
            currentMemories.map((memory) =>
              memory.id === updatedMemory.id
                ? updatedMemory
                : memory
            )
          )

          setViewingMemory((currentMemory) =>
            currentMemory?.id === updatedMemory.id
              ? updatedMemory
              : currentMemory
          )

          return
        }
      } catch (error) {
        console.error('Failed to check AI processing status:', error)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  async function saveMemory() {
    if (!selectedPhoto) {
      setSaveError('Please choose a photo first.')
      return
    }

    setSavingMemory(true)
    setSaveError('')

    try {
      const formData = new FormData()

      formData.append('image', selectedPhoto)

      const trimmedDescription = userDescription.trim()

      if (trimmedDescription) {
        formData.append('userDescription', trimmedDescription)
      }

      const response = await fetch(`${API_URL}/api/memories`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to save memory')
      }

      const savedMemory = await response.json()

      setMemories((currentMemories) => [
        savedMemory,
        ...currentMemories,
      ])

      setSearched(false)

      removeSelectedPhoto()
      setUserDescription('')
      setShowAddMemory(false)

      waitForAiProcessing(savedMemory.id)
    } catch (error) {
      console.error('Failed to save memory:', error)
      setSaveError(
        'Could not save this memory. Please make sure the backend is running.'
      )
    } finally {
      setSavingMemory(false)
    }
  }

  async function toggleFavorite(memory) {
    setActionError('')

    const newFavorite = !memory.favorite

    const previousMemories = memories
    const previousViewingMemory = viewingMemory

    const updateFavoriteState = (items) =>
      items.map((item) =>
        item.id === memory.id
          ? { ...item, favorite: newFavorite }
          : item
      )

    setMemories(updateFavoriteState)
    setViewingMemory((currentMemory) =>
      currentMemory?.id === memory.id
        ? { ...currentMemory, favorite: newFavorite }
        : currentMemory
    )

    try {
      const response = await fetch(
        `${API_URL}/api/memories/${memory.id}/favorite?favorite=${newFavorite}`,
        {
          method: 'PATCH',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update favorite')
      }

      const updatedMemory = await response.json()

      setMemories((currentMemories) =>
        currentMemories.map((item) =>
          item.id === updatedMemory.id ? updatedMemory : item
        )
      )

      setViewingMemory((currentMemory) =>
        currentMemory?.id === updatedMemory.id
          ? updatedMemory
          : currentMemory
      )
    } catch (error) {
      console.error('Failed to update favorite:', error)

      setMemories(previousMemories)
      setViewingMemory(previousViewingMemory)

      setActionError('Could not update favorite.')
    }
  }

  function openRemarkEditor(memory) {
    setActionError('')
    setRemarkMemoryId(memory.id)
    setRemarkText(memory.remark || '')
  }

  function closeRemarkEditor() {
    setRemarkMemoryId(null)
    setRemarkText('')
  }

  async function saveRemark() {
    if (remarkMemoryId === null) {
      return
    }

    setActionError('')

    try {
      const params = new URLSearchParams()
      const trimmedRemark = remarkText.trim()

      if (trimmedRemark) {
        params.set('remark', trimmedRemark)
      }

      const response = await fetch(
        `${API_URL}/api/memories/${remarkMemoryId}/remark?${params.toString()}`,
        {
          method: 'PATCH',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to save remark')
      }

      const updatedMemory = await response.json()

      setMemories((currentMemories) =>
        currentMemories.map((item) =>
          item.id === updatedMemory.id ? updatedMemory : item
        )
      )

      setViewingMemory((currentMemory) =>
        currentMemory?.id === updatedMemory.id
          ? updatedMemory
          : currentMemory
      )

      closeRemarkEditor()
    } catch (error) {
      console.error('Failed to save remark:', error)
      setActionError('Could not save your remark.')
    }
  }

  async function deleteRemark() {
    if (remarkMemoryId === null) {
      return
    }

    setActionError('')

    try {
      const response = await fetch(
        `${API_URL}/api/memories/${remarkMemoryId}/remark`,
        {
          method: 'PATCH',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete remark')
      }

      const updatedMemory = await response.json()

      setMemories((currentMemories) =>
        currentMemories.map((item) =>
          item.id === updatedMemory.id ? updatedMemory : item
        )
      )

      setViewingMemory((currentMemory) =>
        currentMemory?.id === updatedMemory.id
          ? updatedMemory
          : currentMemory
      )

      closeRemarkEditor()
    } catch (error) {
      console.error('Failed to delete remark:', error)
      setActionError('Could not delete your remark.')
    }
  }

  async function deleteMemory(memoryId) {
    const confirmed = window.confirm(
      'Delete this memory permanently?'
    )

    if (!confirmed) {
      return
    }

    setActionError('')

    try {
      const response = await fetch(
        `${API_URL}/api/memories/${memoryId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete memory')
      }

      setMemories((currentMemories) =>
        currentMemories.filter((memory) => memory.id !== memoryId)
      )

      if (viewingMemory?.id === memoryId) {
        closeMemoryViewer()
      }

      if (remarkMemoryId === memoryId) {
        closeRemarkEditor()
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
      setActionError('Could not delete this memory.')
    }
  }

  async function searchMemories(event) {
    event.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setMemories([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const response = await fetch(
        `${API_URL}/api/memories/search?q=${encodeURIComponent(trimmedQuery)}&limit=6`
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setMemories(data)
    } catch (error) {
      console.error('Memory search failed:', error)
      setMemories([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">M</span>
          <span>MemoryBox</span>
        </div>

        <button
          className="header-add-button"
          type="button"
          onClick={() => setShowAddMemory(true)}
        >
          <span>+</span>
          Add memory
        </button>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">A LITTLE PLACE FOR BIG MEMORIES</p>

          <h1>
            Remember it
            <br />
            <em>by the feeling.</em>
          </h1>

          <p className="hero-text">
            Your photos hold more than dates and filenames.
            Search them the way you remember them.
          </p>

          <form className="search-box" onSubmit={searchMemories}>
            <span className="search-icon">⌕</span>

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What do you remember?"
              aria-label="Search your memories"
            />

            <button type="submit" className="search-button">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <p className="search-hint">
            Try <span>“that sunny tennis day”</span>
          </p>
        </div>
      </section>

      <section className="collection">
        <div className="collection-heading">
          <div>
            <p className="eyebrow">YOUR COLLECTION</p>
            <h2>{searched ? 'Moments you remembered' : 'Your memories'}</h2>
          </div>

          {!searched && (
            <p className="collection-note">
              Search naturally. MemoryBox will do the remembering.
            </p>
          )}
        </div>

        {actionError && (
          <p className="collection-action-error">
            {actionError}
          </p>
        )}

        {loading && (
          <div className="state-card">
            <div className="state-symbol">✦</div>
            <h3>Looking through your memories...</h3>
            <p>Finding the moments that feel like your search.</p>
          </div>
        )}

        {!loading && searched && memories.length === 0 && (
          <div className="state-card">
            <div className="state-symbol">⌕</div>
            <h3>Nothing surfaced this time.</h3>
            <p>
              Try describing the moment differently. Think about what was
              happening, where you were, or how the photo felt.
            </p>
          </div>
        )}

        {!loading && memories.length > 0 && (
          <div className="memory-grid">
            {memories.map((memory, index) => (
              <article
                className={`memory-card ${
                  index % 3 === 1 ? 'memory-card-offset' : ''
                }`}
                key={memory.id}
              >
                <div
                  className="memory-photo"
                  role="button"
                  tabIndex={0}
                  onClick={() => openMemoryViewer(memory)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openMemoryViewer(memory)
                    }
                  }}
                  aria-label="Open memory"
                >
                  <img
                    src={`${API_URL}/${memory.imageUrl}`}
                    alt={
                      memory.aiCaption ||
                      memory.userDescription ||
                      'Saved memory'
                    }
                  />

                  <button
                    className={`favorite-button ${
                      memory.favorite ? 'is-favorite' : ''
                    }`}
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      toggleFavorite(memory)
                    }}
                    aria-label={
                      memory.favorite
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                    title={
                      memory.favorite
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                  >
                    {memory.favorite ? '♥' : '♡'}
                  </button>
                </div>

                <div className="memory-details">
                  <div className="memory-topline">
                    <span className="memory-label">
                      {memory.aiCaption
                        ? '✦ AI understood'
                        : '✦ AI is understanding...'}
                    </span>

                    <span className="memory-date">
                      {new Date(memory.createdAt).toLocaleDateString(
                        undefined,
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </span>
                  </div>

                  <h3>{memory.userDescription || 'A little moment'}</h3>

                  <p>
                    {memory.aiCaption ||
                      'MemoryBox is quietly understanding this photo...'}
                  </p>

                  {memory.remark && (
                    <div className="memory-remark">
                      <span>“</span>
                      {memory.remark}
                    </div>
                  )}

                  <div className="memory-actions">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        toggleFavorite(memory)
                      }}
                    >
                      {memory.favorite ? '♥ Favorited' : '♡ Favorite'}
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        openRemarkEditor(memory)
                      }}
                    >
                      ✎ {memory.remark ? 'Edit remark' : 'Add remark'}
                    </button>

                    <button
                      type="button"
                      className="delete-action"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        deleteMemory(memory.id)
                      }}
                    >
                      × Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!searched && !loading && memories.length === 0 && (
          <div className="welcome-card">
            <div className="welcome-copy">
              <span className="welcome-number">01</span>

              <div>
                <h3>Start with a memory.</h3>
                <p>
                  Add a photo, tell us a little about it, and let MemoryBox
                  quietly understand the rest.
                </p>
              </div>
            </div>

            <button
              className="welcome-add-button"
              type="button"
              onClick={() => setShowAddMemory(true)}
            >
              <span>+</span>
              Save your first memory
            </button>
          </div>
        )}
      </section>

      <footer className="footer">
        <span>MemoryBox</span>
        <span>Made for the moments worth keeping.</span>
      </footer>

      {showAddMemory && (
        <div
          className="modal-backdrop"
          onClick={closeAddMemory}
        >
          <div
            className="add-memory-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW MEMORY</p>
                <h2>Add a memory</h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={closeAddMemory}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              hidden
            />

            {!photoPreview ? (
              <button
                className="upload-placeholder"
                type="button"
                onClick={openFilePicker}
              >
                <span className="upload-symbol">+</span>
                <strong>Choose a photo</strong>
                <span>JPG, PNG or WEBP · up to 10 MB</span>
              </button>
            ) : (
              <div className="photo-preview">
                <img
                  src={photoPreview}
                  alt="Selected memory preview"
                />

                <div className="photo-preview-actions">
                  <span>{selectedPhoto?.name}</span>

                  <button
                    type="button"
                    onClick={openFilePicker}
                  >
                    Change photo
                  </button>

                  <button
                    type="button"
                    onClick={removeSelectedPhoto}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <label className="memory-description-label">
              What do you remember?
              <span
                style={{
                  marginLeft: '6px',
                  color: '#aaa69a',
                  fontSize: '10px',
                  fontWeight: '400',
                }}
              >
                Optional
              </span>

              <input
                type="text"
                value={userDescription}
                onChange={(event) =>
                  setUserDescription(event.target.value)
                }
                placeholder="e.g. Our tennis day"
                maxLength={500}
              />
            </label>

            {saveError && (
              <p
                style={{
                  margin: '12px 0 0',
                  color: '#8b6259',
                  fontSize: '11px',
                  lineHeight: '1.5',
                }}
              >
                {saveError}
              </p>
            )}

            <button
              className="save-memory-button"
              type="button"
              onClick={saveMemory}
              disabled={savingMemory}
            >
              {savingMemory ? 'Saving your memory...' : 'Save memory'}
            </button>
          </div>
        </div>
      )}

      {remarkMemoryId !== null && (
        <div
          className="modal-backdrop"
          onClick={closeRemarkEditor}
        >
          <div
            className="remark-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">A LITTLE NOTE</p>
                <h2>
                  {memories.find(
                    (memory) => memory.id === remarkMemoryId
                  )?.remark
                    ? 'Edit your remark'
                    : 'Add a remark'}
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={closeRemarkEditor}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <textarea
              value={remarkText}
              onChange={(event) => setRemarkText(event.target.value)}
              placeholder="Add something you want to remember about this moment..."
              maxLength={500}
              rows={5}
              autoFocus
            />

            <div className="remark-modal-actions">
              {memories.find(
                (memory) => memory.id === remarkMemoryId
              )?.remark && (
                <button
                  type="button"
                  className="remark-delete-button"
                  onClick={deleteRemark}
                >
                  Delete remark
                </button>
              )}

              <button
                type="button"
                onClick={closeRemarkEditor}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveRemark}
              >
                Save remark
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingMemory && (
        <div
          className="memory-viewer"
          onClick={closeMemoryViewer}
        >
          <div
            className="memory-viewer-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="memory-viewer-close"
              type="button"
              onClick={closeMemoryViewer}
              aria-label="Close image viewer"
            >
              ×
            </button>

            <div className="memory-viewer-image">
              <img
                src={`${API_URL}/${viewingMemory.imageUrl}`}
                alt={
                  viewingMemory.aiCaption ||
                  viewingMemory.userDescription ||
                  'Memory'
                }
              />
            </div>

            <div className="memory-viewer-details">
              <p className="eyebrow">
                {viewingMemory.favorite
                  ? '♥ FAVOURITE MEMORY'
                  : 'A MOMENT TO REMEMBER'}
              </p>

              <h2>
                {viewingMemory.userDescription || 'A little moment'}
              </h2>

              <p>
                {viewingMemory.aiCaption ||
                  'MemoryBox is still understanding this photo...'}
              </p>

              {viewingMemory.remark && (
                <div className="memory-viewer-remark">
                  “ {viewingMemory.remark}
                </div>
              )}

              <button
                className={`memory-viewer-favorite ${
                  viewingMemory.favorite ? 'is-favorite' : ''
                }`}
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  toggleFavorite(viewingMemory)
                }}
              >
                {viewingMemory.favorite
                  ? '♥ Remove from favorites'
                  : '♡ Add to favorites'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App

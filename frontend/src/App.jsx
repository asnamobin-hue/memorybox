import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_URL = 'https://memorybox-o9np.onrender.com'

const EXAMPLE_MEMORIES = [
  'our tennis day',
  'the evening we watched the city lights',
  'that rainy day at college',
]

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AiNote({ caption, featured = false }) {
  return (
    <div className={`ai-note ${featured ? 'is-featured' : ''} ${caption ? '' : 'is-pending'}`}>
      <div className="ai-note-heading">
        <span className="ai-dot" aria-hidden="true">✦</span>
        <span>{caption ? 'MemoryBox understood' : 'MemoryBox is looking…'}</span>
      </div>

      {caption && <p>{caption}</p>}
    </div>
  )
}

function FavoriteButton({ memory, onFavorite }) {
  return (
    <button
      className={`favorite-button ${memory.favorite ? 'is-favorite' : ''}`}
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onFavorite(memory)
      }}
      aria-label={memory.favorite ? 'Remove from favorites' : 'Add to favorites'}
      title={memory.favorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {memory.favorite ? '♥' : '♡'}
    </button>
  )
}

function MemoryCard({
  memory,
  variant = 'archive',
  delay = 0,
  onOpen,
  onFavorite,
  onRemark,
  onDelete,
}) {
  const date = formatDate(memory.createdAt)

  return (
    <article
      className={`memory-card memory-card--${variant}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="memory-photo">
        {variant === 'featured' && (
          <div className="photo-tape" aria-hidden="true" />
        )}

        <button
          className="photo-button"
          type="button"
          onClick={() => onOpen(memory)}
          aria-label="Open memory"
        >
          <img
            src={`${API_URL}/${memory.imageUrl}`}
            alt={memory.aiCaption || memory.userDescription || 'Saved memory'}
            loading="lazy"
          />
        </button>

        <FavoriteButton memory={memory} onFavorite={onFavorite} />
      </div>

      <div className="memory-content">
        {variant === 'featured' && (
          <div className="match-badge">
            <span>01</span>
            Closest memory
          </div>
        )}

        <div className="memory-meta">
          <span>{date}</span>
          {memory.favorite && <span>♥ Favourite</span>}
        </div>

        <h3>
          {memory.userDescription || 'A little moment'}
        </h3>

        <AiNote
          caption={memory.aiCaption}
          featured={variant === 'featured'}
        />

        {memory.remark && (
          <blockquote className="memory-quote">
            “{memory.remark}”
          </blockquote>
        )}

        <div className="memory-actions">
          <button type="button" onClick={() => onRemark(memory)}>
            {memory.remark ? 'Edit note' : 'Add note'}
          </button>

          <button
            type="button"
            className="delete-action"
            onClick={() => onDelete(memory.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [loadError, setLoadError] = useState('')

  const [showAddMemory, setShowAddMemory] = useState(false)
  const [viewingMemory, setViewingMemory] = useState(null)

  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [userDescription, setUserDescription] = useState('')
  const [savingMemory, setSavingMemory] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const [remarkMemoryId, setRemarkMemoryId] = useState(null)
  const [remarkText, setRemarkText] = useState('')
  const [actionError, setActionError] = useState('')

  const fileInputRef = useRef(null)
  const discoveryRef = useRef(null)

  const remarkTarget =
    memories.find((memory) => memory.id === remarkMemoryId) ||
    (viewingMemory?.id === remarkMemoryId ? viewingMemory : null)

  const overlayOpen =
    Boolean(viewingMemory) ||
    showAddMemory ||
    remarkMemoryId !== null

  useEffect(() => {
    async function loadMemories() {
      try {
        const response = await fetch(`${API_URL}/api/memories`)

        if (!response.ok) {
          throw new Error('Failed to load memories')
        }

        const data = await response.json()
        setMemories(data)
        setLoadError('')
      } catch (error) {
        console.error('Failed to load memories:', error)
        setLoadError(
          'We could not reach your memory box. Please make sure the backend is running.'
        )
      }
    }

    loadMemories()
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return

      if (remarkMemoryId !== null) {
        closeRemarkEditor()
        return
      }

      if (showAddMemory) {
        closeAddMemory()
        return
      }

      if (viewingMemory) {
        setViewingMemory(null)
        return
      }

      if (searched) {
        clearSearch()
      }
    }

    document.body.style.overflow = overlayOpen ? 'hidden' : ''
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    overlayOpen,
    viewingMemory,
    showAddMemory,
    remarkMemoryId,
    searched,
  ])

  function openMemoryViewer(memory) {
    setViewingMemory(memory)
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function acceptPhotoFile(file) {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setSaveError('Please choose a JPG, PNG, or WEBP image.')
      return false
    }

    if (file.size > 10 * 1024 * 1024) {
      setSaveError('The image must be 10 MB or smaller.')
      return false
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    setSaveError('')
    setSelectedPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    return true
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!acceptPhotoFile(file)) {
      event.target.value = ''
    }
  }

  function handlePhotoDrop(event) {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]

    if (file) {
      acceptPhotoFile(file)
    }
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
    if (savingMemory) return

    removeSelectedPhoto()
    setUserDescription('')
    setSaveError('')
    setIsDragging(false)
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

        if (!response.ok) return

        const updatedMemory = await response.json()

        if (updatedMemory.aiCaption) {
          setMemories((current) =>
            current.map((memory) =>
              memory.id === updatedMemory.id
                ? updatedMemory
                : memory
            )
          )

          setViewingMemory((current) =>
            current?.id === updatedMemory.id
              ? updatedMemory
              : current
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

      setMemories((current) => [savedMemory, ...current])
      setLoadError('')
      setSearched(false)
      setSearchError('')
      setQuery('')

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
    setViewingMemory((current) =>
      current?.id === memory.id
        ? { ...current, favorite: newFavorite }
        : current
    )

    try {
      const response = await fetch(
        `${API_URL}/api/memories/${memory.id}/favorite?favorite=${newFavorite}`,
        { method: 'PATCH' }
      )

      if (!response.ok) {
        throw new Error('Failed to update favorite')
      }

      const updatedMemory = await response.json()

      setMemories((current) =>
        current.map((item) =>
          item.id === updatedMemory.id ? updatedMemory : item
        )
      )

      setViewingMemory((current) =>
        current?.id === updatedMemory.id
          ? updatedMemory
          : current
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
    if (remarkMemoryId === null) return

    setActionError('')

    try {
      const params = new URLSearchParams()
      const trimmedRemark = remarkText.trim()

      if (trimmedRemark) {
        params.set('remark', trimmedRemark)
      }

      const response = await fetch(
        `${API_URL}/api/memories/${remarkMemoryId}/remark?${params.toString()}`,
        { method: 'PATCH' }
      )

      if (!response.ok) {
        throw new Error('Failed to save remark')
      }

      const updatedMemory = await response.json()

      setMemories((current) =>
        current.map((item) =>
          item.id === updatedMemory.id ? updatedMemory : item
        )
      )

      setViewingMemory((current) =>
        current?.id === updatedMemory.id
          ? updatedMemory
          : current
      )

      closeRemarkEditor()
    } catch (error) {
      console.error('Failed to save remark:', error)
      setActionError('Could not save your remark.')
    }
  }

  async function deleteRemark() {
    if (remarkMemoryId === null) return

    setActionError('')

    try {
      const response = await fetch(
        `${API_URL}/api/memories/${remarkMemoryId}/remark`,
        { method: 'PATCH' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete remark')
      }

      const updatedMemory = await response.json()

      setMemories((current) =>
        current.map((item) =>
          item.id === updatedMemory.id ? updatedMemory : item
        )
      )

      setViewingMemory((current) =>
        current?.id === updatedMemory.id
          ? updatedMemory
          : current
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

    if (!confirmed) return

    setActionError('')

    try {
      const response = await fetch(
        `${API_URL}/api/memories/${memoryId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete memory')
      }

      setMemories((current) =>
        current.filter((memory) => memory.id !== memoryId)
      )

      if (viewingMemory?.id === memoryId) {
        setViewingMemory(null)
      }

      if (remarkMemoryId === memoryId) {
        closeRemarkEditor()
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
      setActionError('Could not delete this memory.')
    }
  }

  async function runSearch(rawQuery) {
    const trimmedQuery = rawQuery.trim()

    if (!trimmedQuery) {
      clearSearch()
      return
    }

    setQuery(rawQuery)
    setSearchedQuery(trimmedQuery)
    setLoading(true)
    setSearched(true)
    setSearchError('')
    setActionError('')

    window.requestAnimationFrame(() => {
      discoveryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })

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
      setSearchError(
        'MemoryBox could not search right now. Please make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  function searchMemories(event) {
    event.preventDefault()
    runSearch(query)
  }

  async function clearSearch() {
    if (loading) return

    setLoading(false)
    setSearched(false)
    setSearchError('')
    setQuery('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })

    try {
      const response = await fetch(`${API_URL}/api/memories`)

      if (!response.ok) {
        throw new Error('Failed to reload memories')
      }

      const data = await response.json()
      setMemories(data)
      setLoadError('')
    } catch (error) {
      console.error('Failed to reload memories:', error)
      setMemories([])
      setSearchError(
        'Could not reload your memories. Please make sure the backend is running.'
      )
    }
  }

  const cardHandlers = {
    onOpen: openMemoryViewer,
    onFavorite: toggleFavorite,
    onRemark: openRemarkEditor,
    onDelete: deleteMemory,
  }

  const [bestMatch, ...otherMatches] = memories

  return (
    <main className="app">
      <header className="site-header">
        <button
          className="brand"
          type="button"
          onClick={clearSearch}
          aria-label="Go to MemoryBox home"
        >
          <span className="brand-mark">M</span>
          <span className="brand-name">MemoryBox</span>
        </button>

        <button
          className="header-add-button"
          type="button"
          onClick={() => setShowAddMemory(true)}
        >
          <span>+</span>
          Save a memory
        </button>
      </header>

      <section className={`hero ${searched ? 'is-searching' : ''}`}>
        <div className="hero-copy">
          <p className="eyebrow">
            Your personal memory archive
          </p>

          <h1>
            Remember the moment.
            <span>Find the photo.</span>
          </h1>

          <p className="hero-text">
            Tell MemoryBox what you remember — a person,
            a place, a feeling, or a tiny detail.
            Search your photographs by meaning, not filenames.
          </p>
        </div>

        <form className="search-composer" onSubmit={searchMemories}>
          <div className="search-icon" aria-hidden="true">⌕</div>

          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Describe a memory…"
            aria-label="Describe a memory to search"
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Searching' : 'Find memory'}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="example-searches">
          <span>Try</span>

          {EXAMPLE_MEMORIES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => runSearch(example)}
              disabled={loading}
            >
              “{example}”
            </button>
          ))}
        </div>

        <div className="hero-note">
          <span className="hero-note-line" />
          <span>Search with a sentence. MemoryBox understands the meaning.</span>
        </div>
      </section>

      {searched ? (
        <section className="discovery" ref={discoveryRef}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {loading ? 'Searching your archive' : 'Memory search'}
              </p>

              <h2>
                “{searchedQuery}”
              </h2>
            </div>

            {!loading && (
              <button
                className="back-button"
                type="button"
                onClick={clearSearch}
              >
                ← All memories
              </button>
            )}
          </div>

          {actionError && (
            <p className="inline-error" role="alert">
              {actionError}
            </p>
          )}

          {loading && (
            <div className="search-loading">
              <div className="loading-mark">✦</div>
              <div>
                <strong>Looking through your memories</strong>
                <span>Matching what you described with what your photos contain…</span>
              </div>
            </div>
          )}

          {!loading && searchError && (
            <div className="quiet-state">
              <span className="quiet-number">!</span>
              <h3>Something interrupted the search.</h3>
              <p>{searchError}</p>
              <button className="back-button" type="button" onClick={clearSearch}>
                Back to collection
              </button>
            </div>
          )}

          {!loading && !searchError && memories.length === 0 && (
            <div className="quiet-state">
              <span className="quiet-number">00</span>
              <h3>We couldn't find that moment.</h3>
              <p>
                Try describing what was happening, where you were,
                who was there, or what the day felt like.
              </p>
              <button className="back-button" type="button" onClick={clearSearch}>
                See all memories
              </button>
            </div>
          )}

          {!loading && !searchError && bestMatch && (
            <>
              <div className="result-intro">
                <span>Closest match</span>
                <p>
                  MemoryBox found a photograph that best matches what you remembered.
                </p>
              </div>

              <MemoryCard
                memory={bestMatch}
                variant="featured"
                {...cardHandlers}
              />

              {otherMatches.length > 0 && (
                <div className="other-results">
                  <div className="subsection-heading">
                    <div>
                      <span className="section-index">02—</span>
                      <h3>More from your archive</h3>
                    </div>
                    <p>Other memories returned by the search.</p>
                  </div>

                  <div className="memory-grid">
                    {otherMatches.map((memory, index) => (
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        variant="archive"
                        delay={index * 80}
                        {...cardHandlers}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="archive">
          {loadError && memories.length === 0 ? (
            <div className="quiet-state">
              <span className="quiet-number">!</span>
              <h3>Your memory box is unavailable.</h3>
              <p>{loadError}</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-photo">
                <span>+</span>
              </div>

              <p className="eyebrow">Begin your archive</p>
              <h2>
                Start with one moment
                <em>worth remembering.</em>
              </h2>

              <p>
                Save a photograph and a little context.
                Later, describe the moment in your own words
                and MemoryBox will help you find it.
              </p>

              <button
                className="primary-button"
                type="button"
                onClick={() => setShowAddMemory(true)}
              >
                Save your first memory
                <span>→</span>
              </button>
            </div>
          ) : (
            <>
              <div className="archive-heading">
                <div>
                  <p className="eyebrow">Your archive</p>
                  <h2>Moments worth keeping</h2>
                </div>

                <div className="archive-count">
                  <strong>{memories.length}</strong>
                  <span>{memories.length === 1 ? 'memory' : 'memories'}</span>
                </div>
              </div>

              {actionError && (
                <p className="inline-error" role="alert">
                  {actionError}
                </p>
              )}

              <div className="memory-grid">
                {memories.map((memory, index) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    variant="archive"
                    delay={index * 60}
                    {...cardHandlers}
                  />
                ))}
              </div>

              <div className="archive-footer">
                <div>
                  <span className="archive-footer-mark">✦</span>
                  <div>
                    <strong>Keep the little things.</strong>
                    <p>The more memories you save, the more there is to rediscover.</p>
                  </div>
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setShowAddMemory(true)}
                >
                  Save another
                  <span>→</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <footer className="footer">
        <span>MemoryBox</span>
        <span>Made for the moments worth keeping.</span>
      </footer>

      {showAddMemory && (
        <div className="modal-backdrop" onClick={closeAddMemory}>
          <div
            className="modal add-memory-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Save a memory"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">New memory</p>
                <h2>Save a moment.</h2>
                <p className="modal-intro">
                  Add a photo and, if you want, a few words.
                  MemoryBox will take care of the rest.
                </p>
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
                className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
                type="button"
                onClick={openFilePicker}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handlePhotoDrop}
              >
                <span className="dropzone-icon">+</span>
                <strong>Choose a photograph</strong>
                <span>or drag one into this space</span>
                <small>JPG, PNG or WEBP · up to 10 MB</small>
              </button>
            ) : (
              <div className="photo-preview">
                <img src={photoPreview} alt="Selected memory preview" />

                <div className="photo-preview-actions">
                  <span>{selectedPhoto?.name}</span>

                  <button type="button" onClick={openFilePicker}>
                    Change
                  </button>

                  <button type="button" onClick={removeSelectedPhoto}>
                    Remove
                  </button>
                </div>
              </div>
            )}

            <label className="field">
              <span className="field-label">
                What do you want to remember?
                <em>Optional</em>
              </span>

              <input
                type="text"
                value={userDescription}
                onChange={(event) => setUserDescription(event.target.value)}
                placeholder="e.g. our first tennis match together"
                maxLength={500}
              />
            </label>

            <div className="ai-explainer">
              <span>✦</span>
              <p>
                MemoryBox will look at the photograph and combine
                what it sees with your words so you can search for
                this moment naturally later.
              </p>
            </div>

            {saveError && (
              <p className="inline-error" role="alert">
                {saveError}
              </p>
            )}

            <button
              className="primary-button full"
              type="button"
              onClick={saveMemory}
              disabled={savingMemory}
            >
              {savingMemory ? 'Saving your memory…' : 'Save memory'}
              {!savingMemory && <span>→</span>}
            </button>
          </div>
        </div>
      )}

      {remarkMemoryId !== null && (
        <div className="modal-backdrop" onClick={closeRemarkEditor}>
          <div
            className="modal remark-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Memory note"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Your words</p>
                <h2>
                  {remarkTarget?.remark
                    ? 'Edit your note.'
                    : 'Add a little note.'}
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
              placeholder="Something you want to remember about this moment…"
              maxLength={500}
              rows={5}
              autoFocus
            />

            <div className="modal-actions">
              {remarkTarget?.remark && (
                <button
                  type="button"
                  className="danger-link"
                  onClick={deleteRemark}
                >
                  Delete note
                </button>
              )}

              <button
                type="button"
                className="ghost-button"
                onClick={closeRemarkEditor}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={saveRemark}
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingMemory && (
        <div
          className="memory-viewer"
          onClick={() => setViewingMemory(null)}
        >
          <div
            className="memory-viewer-content"
            role="dialog"
            aria-modal="true"
            aria-label="Memory"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="memory-viewer-close"
              type="button"
              onClick={() => setViewingMemory(null)}
              aria-label="Close memory"
            >
              ×
            </button>

            <div className="viewer-image">
              <img
                src={`${API_URL}/${viewingMemory.imageUrl}`}
                alt={
                  viewingMemory.aiCaption ||
                  viewingMemory.userDescription ||
                  'Memory'
                }
              />
            </div>

            <div className="viewer-details">
              <div className="viewer-topline">
                <span>
                  {viewingMemory.favorite ? '♥ Favourite' : 'Memory'}
                </span>
                <span>{formatDate(viewingMemory.createdAt)}</span>
              </div>

              <h2>
                {viewingMemory.userDescription || 'A little moment'}
              </h2>

              <AiNote caption={viewingMemory.aiCaption} featured />

              {viewingMemory.remark && (
                <div className="viewer-note">
                  <span>Your note</span>
                  <blockquote>
                    “{viewingMemory.remark}”
                  </blockquote>
                </div>
              )}

              <div className="viewer-actions">
                <button
                  type="button"
                  className={viewingMemory.favorite ? 'is-favorite' : ''}
                  onClick={() => toggleFavorite(viewingMemory)}
                >
                  {viewingMemory.favorite
                    ? '♥ Remove favourite'
                    : '♡ Add favourite'}
                </button>

                <button
                  type="button"
                  onClick={() => openRemarkEditor(viewingMemory)}
                >
                  {viewingMemory.remark ? 'Edit note' : 'Add note'}
                </button>

                <button
                  type="button"
                  className="delete-action"
                  onClick={() => deleteMemory(viewingMemory.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App

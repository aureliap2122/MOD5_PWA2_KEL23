import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Catalog, { DEFAULT_CATALOG_VIEW } from './pages/Catalog.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import { setQueryData } from './lib/queryCache.js'
import { gunKeys } from './hooks/useGuns.js'
import { clearGunUrl, pushGunUrl, readSharedGunId } from './utils/share.js'
import './App.css'

// ---------------------------------------------------------------------------
// Lazy-loaded pages: each one is split into its own JS chunk and only
// downloaded the first time the user opens it. (Catalog is the landing page,
// so it stays in the main bundle.)
// ---------------------------------------------------------------------------
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetailPage = lazy(() => import('./pages/GunDetailPage.jsx'))

function PageLoader() {
  return (
    <div className="state-box" role="status">
      <Loader size={28} className="spin" />
      <p>Loading…</p>
    </div>
  )
}

function App() {
  // A shared link (`/?gun=<id>`) opens straight into that product's detail page.
  const [sharedId] = useState(readSharedGunId)

  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  // 'list' | 'create' | 'edit' | 'detail' | 'editProfile'
  const [mode, setMode] = useState(sharedId ? 'detail' : 'list')
  const [detailId, setDetailId] = useState(sharedId)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // Catalog page / search / filter / sort live here so they survive opening a product.
  const [catalogView, setCatalogView] = useState(DEFAULT_CATALOG_VIEW)

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  // Browser back / forward between the list and product links.
  useEffect(() => {
    const onPopState = () => {
      const id = readSharedGunId()
      if (id) {
        setDetailId(id)
        setMode('detail')
      } else {
        setMode('list')
        setEditingGun(null)
      }
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      clearGunUrl()
      setMode('create')
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
    } else if (target === 'Detail') {
      const id = String(payload.id ?? payload.name)
      // We already have the product from the list: seed the cache so the
      // detail page renders instantly without another request.
      setQueryData(gunKeys.detail(id), payload)
      pushGunUrl(id)
      setDetailId(id)
      setMode('detail')
    } else if (target === 'EditProfile') {
      clearGunUrl()
      setMode('editProfile')
    } else {
      // Tab change
      clearGunUrl()
      setTab(target)
      setMode('list')
      setEditingGun(null)
    }
    scrollTop()
  }

  const handleBackToList = useCallback(() => {
    // If we pushed the product URL ourselves, step back in history;
    // otherwise (opened from a shared link) just drop the parameter.
    if (window.history.state && window.history.state.gun) {
      window.history.back()
    } else {
      clearGunUrl()
    }
    setMode('list')
    setEditingGun(null)
  }, [])

  const headerTab = mode === 'list' ? tab : mode === 'editProfile' ? 'Profile' : ''

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={headerTab}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        <Suspense fallback={<PageLoader />}>
          {/* Sub-page views */}
          {mode === 'create' && (
            <CreateGunPage
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'detail' && detailId && (
            <GunDetailPage
              gunId={detailId}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={(g) => setDeleteTarget(g)}
            />
          )}

          {mode === 'editProfile' && (
            <EditProfilePage
              onBack={() => handleNavigate('Profile')}
              onSaved={() => handleNavigate('Profile')}
            />
          )}

          {/* Top-level Tabs */}
          {mode === 'list' && (
            <>
              {tab === 'Catalog' && (
                <Catalog
                  view={catalogView}
                  onViewChange={setCatalogView}
                  onNavigate={(destination, payload) => handleNavigate(destination, payload)}
                />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => handleNavigate('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage
                  onReplaySplash={() => setShowSplash(true)}
                  onEditProfile={() => handleNavigate('EditProfile')}
                  onResumeDraft={(draft) =>
                    draft.kind === 'new'
                      ? handleNavigate('Create')
                      : handleNavigate('Edit', { id: draft.id, name: draft.name })
                  }
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Hardware Record"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await gunService.deleteGun(deleteTarget.id)
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to delete record.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App

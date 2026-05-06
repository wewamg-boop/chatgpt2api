import { useEffect, useState } from 'react'
import { RefreshCw, Trash2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchManagedImages,
  deleteManagedImages,
  fetchImageTags,
  setImageTags,
  type ManagedImage,
} from '../lib/server-api'

export default function ImageManagerPage() {
  const [groups, setGroups] = useState<Array<{ date: string; items: ManagedImage[] }>>([])
  const [tags, setTags] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [tagDialogItem, setTagDialogItem] = useState<ManagedImage | null>(null)
  const [tagInput, setTagInput] = useState('')

  const loadImages = async () => {
    setIsLoading(true)
    try {
      const data = await fetchManagedImages({ start_date: startDate, end_date: endDate })
      setGroups(data.groups || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载图片失败')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTags = async () => {
    try {
      const data = await fetchImageTags()
      setTags(data.tags)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadImages()
    loadTags()
  }, [])

  const allItems = groups.flatMap((g) => g.items)

  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedPaths.size === allItems.length) {
      setSelectedPaths(new Set())
    } else {
      setSelectedPaths(new Set(allItems.map((i) => i.path || i.rel)))
    }
  }

  const handleDelete = async () => {
    if (selectedPaths.size === 0) return
    try {
      await deleteManagedImages({ paths: Array.from(selectedPaths) })
      toast.success(`已删除 ${selectedPaths.size} 张图片`)
      setSelectedPaths(new Set())
      await loadImages()
      await loadTags()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const handleSetTags = async () => {
    if (!tagDialogItem) return
    try {
      const newTags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
      await setImageTags(tagDialogItem.path || tagDialogItem.rel, newTags)
      toast.success('标签已更新')
      setTagDialogItem(null)
      await loadTags()
      await loadImages()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '设置标签失败')
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">图片管理</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadImages(); loadTags() }}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 inline mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          {selectedPaths.size > 0 && (
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              删除 ({selectedPaths.size})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <button
          onClick={loadImages}
          className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          查询
        </button>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">标签:</span>
          {tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Select all */}
      {allItems.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedPaths.size === allItems.length}
            onChange={toggleSelectAll}
          />
          <span className="text-sm text-gray-500">全选 ({allItems.length} 张)</span>
        </div>
      )}

      {/* Image groups */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无图片</div>
      ) : (
        groups.map((group) => (
          <div key={group.date}>
            <h2 className="text-sm font-medium text-gray-500 mb-2">{group.date}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {group.items.map((item) => {
                const path = item.path || item.rel
                return (
                  <div
                    key={path}
                    className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPaths.has(path)}
                      onChange={() => toggleSelect(path)}
                      className="absolute top-2 left-2 z-10"
                    />
                    <img
                      src={item.thumbnail_url || item.url}
                      alt={item.name}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs truncate">{item.name}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.tags.map((tag) => (
                            <span key={tag} className="px-1 py-0.5 rounded bg-white/20 text-white text-[10px]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setTagDialogItem(item)
                        setTagInput((item.tags || []).join(', '))
                      }}
                      className="absolute top-2 right-2 p-1 rounded bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Tag className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Tag dialog */}
      {tagDialogItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTagDialogItem(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold">设置标签</h2>
              <button onClick={() => setTagDialogItem(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-500">{tagDialogItem.name}</p>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="输入标签，用逗号分隔"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setTagInput((prev) => prev ? `${prev}, ${tag}` : tag)}
                      className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-200"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setTagDialogItem(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleSetTags}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { ref, computed, onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * 虚拟滚动 Hook
 * 用于优化大量数据的渲染性能
 */
export function useVirtualScroll<T>(
  items: MaybeRefOrGetter<T[]>,
  options: {
    itemHeight: number
    containerHeight: number
    overscan?: number
  }
) {
  const { itemHeight, containerHeight, overscan = 5 } = options

  const scrollTop = ref(0)
  const containerRef = ref<HTMLElement>()
  const resolvedItems = computed<T[]>(() => toValue(items))

  // 计算可见区域的项目
  const visibleRange = computed(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const startIndex = Math.floor(scrollTop.value / itemHeight)
    const endIndex = Math.min(startIndex + visibleCount + overscan, resolvedItems.value.length)

    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex,
      visibleCount
    }
  })

  // 可见的项目
  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return resolvedItems.value.slice(start, end).map((item, index) => ({
      item,
      index: start + index,
      top: (start + index) * itemHeight
    }))
  })

  // 总高度
  const totalHeight = computed(() => resolvedItems.value.length * itemHeight)

  // 滚动事件处理
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  // 滚动到指定索引
  const scrollToIndex = (index: number) => {
    if (containerRef.value) {
      const targetScrollTop = index * itemHeight
      containerRef.value.scrollTop = targetScrollTop
      scrollTop.value = targetScrollTop
    }
  }

  return {
    containerRef,
    visibleItems,
    totalHeight,
    handleScroll,
    scrollToIndex,
    visibleRange
  }
}

/**
 * 防抖 Hook
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): T {
  let timeoutId: ReturnType<typeof setTimeout>

  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

/**
 * 节流 Hook
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): T {
  let lastCall = 0

  return ((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return fn(...args)
    }
  }) as T
}

/**
 * 懒加载 Hook
 */
export function useLazyLoad(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = ref<HTMLElement>()
  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (targetRef.value) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              isVisible.value = true
              callback()
              observer?.unobserve(entry.target)
            }
          })
        },
        {
          threshold: 0.1,
          ...options
        }
      )

      observer.observe(targetRef.value)
    }
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return {
    targetRef,
    isVisible
  }
}

/**
 * 内存缓存 Hook
 */
export function useMemoryCache<T>(maxSize: number = 100) {
  const cache = new Map<string, { value: T; timestamp: number; accessCount: number }>()

  const get = (key: string): T | null => {
    const item = cache.get(key)
    if (item) {
      item.accessCount++
      return item.value
    }
    return null
  }

  const set = (key: string, value: T): void => {
    // 如果缓存已满，删除最少使用的项
    if (cache.size >= maxSize) {
      let leastUsedKey = ''
      let leastAccessCount = Infinity

      for (const [k, v] of cache.entries()) {
        if (v.accessCount < leastAccessCount) {
          leastAccessCount = v.accessCount
          leastUsedKey = k
        }
      }

      if (leastUsedKey) {
        cache.delete(leastUsedKey)
      }
    }

    cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1
    })
  }

  const has = (key: string): boolean => {
    return cache.has(key)
  }

  const clear = (): void => {
    cache.clear()
  }

  const size = computed(() => cache.size)

  return {
    get,
    set,
    has,
    clear,
    size
  }
}

/**
 * 异步组件加载 Hook
 */
export function useAsyncComponent<T>(
  loader: () => Promise<T>,
  fallback?: T
) {
  const component = ref<T | null>(fallback || null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const load = async () => {
    if (component.value && !fallback) return

    loading.value = true
    error.value = null

    try {
      const result = await loader()
      component.value = result
    } catch (err) {
      error.value = err as Error
      console.error('异步组件加载失败:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    component,
    loading,
    error,
    load
  }
}

/**
 * 性能监控 Hook
 */
export function usePerformanceMonitor() {
  const metrics = ref<{
    renderTime: number
    memoryUsage: number
    componentCount: number
  }>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0
  })

  const startTime = ref(0)

  const startMeasure = (name: string = 'default') => {
    startTime.value = performance.now()
    performance.mark(`${name}-start`)
  }

  const endMeasure = (name: string = 'default') => {
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)

    const measure = performance.getEntriesByName(name)[0]
    metrics.value.renderTime = measure.duration

    // 获取内存使用情况（如果支持）
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      metrics.value.memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024 // MB
    }

    return measure.duration
  }

  const getMetrics = () => {
    return { ...metrics.value }
  }

  return {
    metrics,
    startMeasure,
    endMeasure,
    getMetrics
  }
}

/**
 * 组件复用池 Hook
 */
export function useComponentPool<T>(
  createComponent: () => T,
  maxPoolSize: number = 20
) {
  const pool: T[] = []
  const activeComponents = new Set<T>()

  const acquire = (): T => {
    let component = pool.pop()
    if (!component) {
      component = createComponent()
    }
    activeComponents.add(component)
    return component
  }

  const release = (component: T): void => {
    if (activeComponents.has(component)) {
      activeComponents.delete(component)
      if (pool.length < maxPoolSize) {
        pool.push(component)
      }
    }
  }

  const clear = (): void => {
    pool.length = 0
    activeComponents.clear()
  }

  const stats = computed(() => ({
    poolSize: pool.length,
    activeCount: activeComponents.size,
    totalCreated: pool.length + activeComponents.size
  }))

  return {
    acquire,
    release,
    clear,
    stats
  }
}

/**
 * 批量更新 Hook
 */
export function useBatchUpdate<T>(
  updateFn: (items: T[]) => void,
  batchSize: number = 50,
  delay: number = 16 // 一帧的时间
) {
  const pendingUpdates: T[] = []
  let updateTimer: ReturnType<typeof setTimeout> | null = null

  const addUpdate = (item: T) => {
    pendingUpdates.push(item)

    if (!updateTimer) {
      updateTimer = setTimeout(() => {
        processBatch()
      }, delay)
    }
  }

  const processBatch = () => {
    if (pendingUpdates.length === 0) return

    const batch = pendingUpdates.splice(0, batchSize)
    updateFn(batch)

    if (pendingUpdates.length > 0) {
      updateTimer = setTimeout(() => {
        processBatch()
      }, delay)
    } else {
      updateTimer = null
    }
  }

  const flush = () => {
    if (updateTimer) {
      clearTimeout(updateTimer)
      updateTimer = null
    }
    if (pendingUpdates.length > 0) {
      updateFn(pendingUpdates.splice(0))
    }
  }

  onUnmounted(() => {
    flush()
  })

  return {
    addUpdate,
    flush,
    pendingCount: computed(() => pendingUpdates.length)
  }
}

/**
 * 资源预加载 Hook
 */
export function usePreload() {
  const preloadedResources = new Set<string>()

  const preloadImage = (src: string): Promise<void> => {
    if (preloadedResources.has(src)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        preloadedResources.add(src)
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }

  const preloadScript = (src: string): Promise<void> => {
    if (preloadedResources.has(src)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.onload = () => {
        preloadedResources.add(src)
        resolve()
      }
      script.onerror = reject
      script.src = src
      document.head.appendChild(script)
    })
  }

  const preloadCSS = (href: string): Promise<void> => {
    if (preloadedResources.has(href)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.onload = () => {
        preloadedResources.add(href)
        resolve()
      }
      link.onerror = reject
      link.href = href
      document.head.appendChild(link)
    })
  }

  return {
    preloadImage,
    preloadScript,
    preloadCSS,
    preloadedCount: computed(() => preloadedResources.size)
  }
}

export default {
  useVirtualScroll,
  useDebounce,
  useThrottle,
  useLazyLoad,
  useMemoryCache,
  useAsyncComponent,
  usePerformanceMonitor,
  useComponentPool,
  useBatchUpdate,
  usePreload
}
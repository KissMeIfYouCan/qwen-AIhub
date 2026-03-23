/**
 * 浏览器兼容的 EventEmitter 实现
 */
export class EventEmitter {
  private events: Map<string, Function[]> = new Map()

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(listener)
    return this
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
    return this
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event)
    if (listeners && listeners.length > 0) {
      listeners.forEach(listener => {
        try {
          listener.apply(this, args)
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error)
        }
      })
      return true
    }
    return false
  }

  once(event: string, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper)
      listener.apply(this, args)
    }
    return this.on(event, onceWrapper)
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
    return this
  }

  listenerCount(event: string): number {
    const listeners = this.events.get(event)
    return listeners ? listeners.length : 0
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || []
  }
}
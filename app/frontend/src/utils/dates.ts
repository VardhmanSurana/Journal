const IST = "Asia/Kolkata"

export function toIST(dateStr: string | number | Date): Date {
  const d = new Date(dateStr)
  const ist = d.toLocaleString("en-US", { timeZone: IST })
  return new Date(ist)
}

export function formatDate(dateStr: string | number | Date, style: "full" | "long" | "medium" | "short" = "medium"): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", { timeZone: IST, dateStyle: style })
}

export function formatTime(dateStr: string | number | Date): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit" })
}

export function formatTimeWithSeconds(dateStr: string | number | Date): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function formatDateTime(dateStr: string | number | Date): string {
  const d = new Date(dateStr)
  return d.toLocaleString("en-IN", { timeZone: IST, dateStyle: "long", timeStyle: "short" })
}

export function toISTTimestamp(ts: number): Date {
  const d = new Date(ts * 1000)
  const ist = d.toLocaleString("en-US", { timeZone: IST })
  return new Date(ist)
}

export function getISTDateString(dateStr: string | number | Date): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-CA", { timeZone: IST })
}

export function getISTYearMonth(dateStr: string | number | Date): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-CA", { timeZone: IST }).slice(0, 7)
}

export function getISTDay(dateStr: string | number | Date): number {
  const d = new Date(dateStr)
  return parseInt(d.toLocaleDateString("en-CA", { timeZone: IST }).split("-")[2])
}

export function getISTMonth(dateStr: string | number | Date): number {
  const d = new Date(dateStr)
  return parseInt(d.toLocaleDateString("en-CA", { timeZone: IST }).split("-")[1])
}

export function getISTYear(dateStr: string | number | Date): number {
  const d = new Date(dateStr)
  return parseInt(d.toLocaleDateString("en-CA", { timeZone: IST }).split("-")[0])
}

export function getISTHour(dateStr: string | number | Date): number {
  const d = new Date(dateStr)
  return parseInt(d.toLocaleString("en-US", { timeZone: IST, hour: "2-digit", hour12: false }))
}

export function getISTDayOfWeek(dateStr: string | number | Date): number {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { timeZone: IST, weekday: "short" }) === "Sun" ? 0 :
         d.toLocaleDateString("en-US", { timeZone: IST, weekday: "short" }) === "Mon" ? 1 :
         d.toLocaleDateString("en-US", { timeZone: IST, weekday: "short" }) === "Tue" ? 2 :
         d.toLocaleDateString("en-US", { timeZone: IST, weekday: "short" }) === "Wed" ? 3 :
         d.toLocaleDateString("en-US", { timeZone: IST, weekday: "short" }) === "Thu" ? 4 :
         d.toLocaleDateString("en-US", { timeZone: IST, weekday: "short" }) === "Fri" ? 5 : 6
}

export function isSameISTDay(a: string | number | Date, b: string | number | Date): boolean {
  return getISTDateString(a) === getISTDateString(b)
}

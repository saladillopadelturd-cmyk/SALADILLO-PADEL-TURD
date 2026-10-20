/**
 * Utilidades centralizadas para formateo de fechas en SPT Pádel Tour.
 * Formato unificado en toda la aplicación: dd/mm/aaaa
 */

/**
 * Formatea una fecha (string, Date o timestamp) al formato estándar: dd/mm/aaaa
 * Previene desfases de zona horaria con fechas tipo 'YYYY-MM-DD'.
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  try {
    // Si es string y contiene formato YYYY-MM-DD al inicio sin hora específica
    if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      // Si es formato solo fecha YYYY-MM-DD o YYYY-MM-DDT00:00...
      const onlyDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z?)?$/);
      if (onlyDateMatch) {
        const [, year, month, day] = onlyDateMatch;
        return `${day}/${month}/${year}`;
      }
    }

    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      return typeof dateInput === "string" ? dateInput : "";
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return typeof dateInput === "string" ? dateInput : "";
  }
}

/**
 * Formatea una fecha y hora al formato: dd/mm/aaaa HH:mm [hs]
 */
export function formatDateTime(
  dateInput: string | Date | null | undefined,
  includeHoursSuffix = true
): string {
  if (!dateInput) return "";

  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      return typeof dateInput === "string" ? dateInput : "";
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    const datePart = `${day}/${month}/${year}`;
    const timePart = `${hours}:${minutes}`;

    return includeHoursSuffix ? `${datePart} ${timePart} hs` : `${datePart} ${timePart}`;
  } catch {
    return typeof dateInput === "string" ? dateInput : "";
  }
}

/**
 * Formatea solo la hora: HH:mm [hs]
 */
export function formatTime(
  dateInput: string | Date | null | undefined,
  includeHoursSuffix = false
): string {
  if (!dateInput) return "";

  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      return typeof dateInput === "string" ? dateInput : "";
    }

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const timePart = `${hours}:${minutes}`;

    return includeHoursSuffix ? `${timePart} hs` : timePart;
  } catch {
    return typeof dateInput === "string" ? dateInput : "";
  }
}

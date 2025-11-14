export function normalizeName(name: string) {
  if (!name) return name;

  let sanitized = name
    .replace(/&/g, '') 
    .replace(/</g, '') 
    .replace(/>/g, '') 
    .replace(/"/g, '') 
    .replace(/'/g, ''); 
    
  sanitized = sanitized.slice(0, 15);

  return sanitized;
}
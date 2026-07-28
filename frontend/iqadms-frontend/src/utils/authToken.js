/** Read JWT from login/register API body (camelCase or PascalCase). */
export function readAuthTokenFromResponse(data) {
  if (!data || typeof data === 'string') return ''
  const raw = data.token ?? data.Token ?? ''
  return String(raw).trim()
}

import { appDialog } from './appDialog'

/** Read IQADMS task email headers set by the API (nginx same-origin). */
export async function notifyTaskEmailFromResponse(res, contextLabel) {
  const err = res.headers?.['x-iqadms-task-email-error']
  const to = res.headers?.['x-iqadms-task-email-to']
  const sent = res.headers?.['x-iqadms-task-email-sent']

  if (err) {
    await appDialog.alert(`${contextLabel}\n\nEmail was not sent:\n${err}`)
    return
  }

  if (to) {
    await appDialog.alert(`${contextLabel}\n\nNotification email sent to:\n${to}`)
    return
  }

  if (sent?.startsWith('admins:')) {
    const n = sent.replace('admins:', '')
    await appDialog.alert(`${contextLabel}\n\nReview email sent to ${n} administrator(s).`)
  }
}

export function explainNoAssigneeEmail() {
  return 'No assignment email was sent because the task is assigned to you. Choose another assignee to email them.'
}

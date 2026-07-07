const ONE_DAY_MS = 24 * 60 * 60 * 1000

function parseDeadline(deadline) {
  if (!deadline || deadline === '-') {
    return null
  }

  const date = new Date(String(deadline).replace(/-/g, '/'))

  return Number.isNaN(date.getTime()) ? null : date
}

function getComputedHomeworkStatus(homework) {
  const deadline = parseDeadline(homework.deadline)

  if (!deadline) {
    return homework.status || '进行中'
  }

  const now = new Date()
  const diff = deadline.getTime() - now.getTime()

  if (diff <= 0) {
    return '已截止'
  }

  if (diff <= ONE_DAY_MS) {
    return '即将截止'
  }

  return '进行中'
}

function withComputedHomeworkStatus(homework) {
  const status = getComputedHomeworkStatus(homework)

  return {
    ...homework,
    status,
    statusClass: status === '已截止' ? 'status-ended' : status === '即将截止' ? 'status-urgent' : 'status-normal'
  }
}

function isActiveHomework(homework) {
  return getComputedHomeworkStatus(homework) !== '已截止'
}

function compareDeadlineAsc(a, b) {
  const deadlineA = parseDeadline(a.deadline)
  const deadlineB = parseDeadline(b.deadline)

  if (!deadlineA && !deadlineB) {
    return 0
  }

  if (!deadlineA) {
    return 1
  }

  if (!deadlineB) {
    return -1
  }

  return deadlineA.getTime() - deadlineB.getTime()
}

module.exports = {
  getComputedHomeworkStatus,
  withComputedHomeworkStatus,
  isActiveHomework,
  compareDeadlineAsc
}

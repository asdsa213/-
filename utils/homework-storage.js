const STORAGE_KEY = 'local_homeworks'

function getLocalHomeworks() {
  return wx.getStorageSync(STORAGE_KEY) || []
}

function setLocalHomeworks(homeworks) {
  wx.setStorageSync(STORAGE_KEY, homeworks)
}

function saveLocalHomework(homework) {
  const localHomeworks = getLocalHomeworks()

  setLocalHomeworks([
    homework,
    ...localHomeworks
  ])
}

function deleteLocalHomework(id) {
  const localHomeworks = getLocalHomeworks()
  const nextHomeworks = localHomeworks.filter((item) => item.id !== id)

  setLocalHomeworks(nextHomeworks)
}

function findLocalHomework(id) {
  const localHomeworks = getLocalHomeworks()

  return localHomeworks.find((item) => item.id === id)
}

module.exports = {
  getLocalHomeworks,
  saveLocalHomework,
  deleteLocalHomework,
  findLocalHomework
}

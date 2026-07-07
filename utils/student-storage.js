const STORAGE_KEY = 'student_profile'

function getStudentProfile() {
  return wx.getStorageSync(STORAGE_KEY) || null
}

function saveStudentProfile(profile) {
  wx.setStorageSync(STORAGE_KEY, profile)
}

function clearStudentProfile() {
  wx.removeStorageSync(STORAGE_KEY)
}

function hasStudentProfile() {
  const profile = getStudentProfile()

  return !!(profile && profile.name && profile.studentNo && profile.classId)
}

function normalizeStudentProfile(profile) {
  if (!profile) {
    return null
  }

  const classes = profile.classes && profile.classes.length > 0 ? profile.classes : [{
    id: profile.classId,
    name: profile.className
  }]

  return {
    ...profile,
    classes
  }
}

function mergeCloudStudentWithLocalSelection(cloudProfile, localProfile) {
  const profile = normalizeStudentProfile(cloudProfile || localProfile)
  const local = normalizeStudentProfile(localProfile)

  if (!profile || !local || !local.classId) {
    return profile
  }

  const activeClass = profile.classes.find((item) => item.id === local.classId)

  if (!activeClass) {
    return profile
  }

  return {
    ...profile,
    classId: activeClass.id,
    className: activeClass.name
  }
}

module.exports = {
  getStudentProfile,
  saveStudentProfile,
  clearStudentProfile,
  hasStudentProfile,
  normalizeStudentProfile,
  mergeCloudStudentWithLocalSelection
}

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function isAdmin(openid) {
  const res = await db.collection('admins')
    .where({
      openid,
      enabled: true
    })
    .limit(1)
    .get()

  return res.data.length > 0
}

async function isCourseRep(openid, classId, courseId) {
  const res = await db.collection('course_reps')
    .where({
      openid,
      classId,
      courseId,
      enabled: true
    })
    .limit(1)
    .get()

  return res.data.length > 0
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const homeworkId = event.homeworkId
  const homework = event.homework || {}

  if (!homeworkId) {
    return {
      success: false,
      message: '缺少作业ID'
    }
  }

  let oldHomework

  try {
    const oldRes = await db.collection('homework').doc(homeworkId).get()
    oldHomework = oldRes.data
  } catch (error) {
    return {
      success: false,
      message: '作业不存在'
    }
  }

  const admin = await isAdmin(openid)
  const rep = await isCourseRep(openid, oldHomework.classId, oldHomework.courseId)

  if (!admin && !rep) {
    return {
      success: false,
      message: '无修改权限'
    }
  }

  const title = (homework.title || '').trim()
  const deadline = (homework.deadline || '').trim()
  const requirement = (homework.requirement || '').trim()
  const note = (homework.note || '').trim() || '无'

  if (!title || !deadline || !requirement) {
    return {
      success: false,
      message: '请填写完整作业信息'
    }
  }

  const summary = requirement.length > 28 ? `${requirement.slice(0, 28)}...` : requirement

  await db.collection('homework').doc(homeworkId).update({
    data: {
      title,
      deadline,
      summary,
      requirement,
      note,
      status: homework.status || oldHomework.status || '进行中',
      updateTime: db.serverDate(),
      updaterOpenid: openid
    }
  })

  return {
    success: true
  }
}

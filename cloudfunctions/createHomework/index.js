const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const HOMEWORK_NOTICE_TEMPLATE_ID = 'LYY32zo4dydXEjJWATtbRnDrGMa_Euq_ygm4OzDCHKs'

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

function formatDateTime(date) {
  const pad = (number) => number < 10 ? `0${number}` : `${number}`

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function limitText(value, maxLength) {
  const text = value || ''

  return text.length > maxLength ? text.slice(0, maxLength) : text
}

async function sendHomeworkNotice(homework, homeworkId) {
  const studentByClassIds = await db.collection('students')
    .where({
      classIds: homework.classId,
      homeworkNoticeEnabled: true
    })
    .get()
  const studentByClassId = await db.collection('students')
    .where({
      classId: homework.classId,
      homeworkNoticeEnabled: true
    })
    .get()
  const students = studentByClassIds.data
    .concat(studentByClassId.data)
    .filter((item, index, array) => array.findIndex((student) => student._id === item._id) === index)

  const sendResults = []

  for (const student of students) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: student.openid,
        templateId: HOMEWORK_NOTICE_TEMPLATE_ID,
        page: `pages/homework-detail/homework-detail?id=${homeworkId}&source=cloud`,
        data: {
          thing1: {
            value: limitText(homework.courseName, 20)
          },
          thing2: {
            value: limitText(homework.title, 20)
          },
          time3: {
            value: homework.deadline
          },
          thing4: {
            value: limitText(homework.note || '请及时查看作业要求', 20)
          }
        }
      })

      sendResults.push({
        openid: student.openid,
        success: true
      })
    } catch (error) {
      console.error('发送作业订阅消息失败', student.openid, error)
      sendResults.push({
        openid: student.openid,
        success: false,
        message: error.errMsg || error.message || '发送失败'
      })
    }

    await db.collection('students')
      .doc(student._id)
      .update({
        data: {
          homeworkNoticeEnabled: false,
          homeworkNoticeLastSendTime: db.serverDate()
        }
      })
  }

  return sendResults
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const homework = event.homework || {}
  const requiredFields = ['classId', 'className', 'courseId', 'courseName', 'title', 'deadline', 'requirement']
  const missingField = requiredFields.find((field) => !homework[field])

  if (missingField) {
    return {
      success: false,
      message: '请填写完整作业信息'
    }
  }

  const admin = await isAdmin(openid)
  const rep = await isCourseRep(openid, homework.classId, homework.courseId)

  if (!admin && !rep) {
    return {
      success: false,
      message: '无发布权限'
    }
  }

  const now = new Date()
  const publishTime = homework.publishTime || formatDateTime(now)
  const summary = homework.summary || (homework.requirement.length > 28 ? `${homework.requirement.slice(0, 28)}...` : homework.requirement)
  const homeworkData = {
    classId: homework.classId,
    className: homework.className,
    courseId: homework.courseId,
    courseName: homework.courseName,
    title: homework.title,
    publishTime,
    deadline: homework.deadline,
    summary,
    requirement: homework.requirement,
    note: homework.note || '无',
    status: homework.status || '进行中',
    creatorOpenid: openid,
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  }
  const addResult = await db.collection('homework')
    .add({
      data: homeworkData
    })
  const noticeResults = await sendHomeworkNotice(homeworkData, addResult._id)

  return {
    success: true,
    homeworkId: addResult._id,
    noticeResults
  }
}

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const classId = (event.classId || '').trim()

  if (!classId) {
    return {
      success: false,
      message: '缺少班级编号'
    }
  }

  const res = await db.collection('students')
    .where({
      openid
    })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return {
      success: false,
      message: '请先绑定学生信息'
    }
  }

  const student = res.data[0]
  const oldClasses = student.classes && student.classes.length > 0 ? student.classes : [{
    id: student.classId,
    name: student.className
  }]
  const nextClasses = oldClasses.filter((item) => item.id !== classId)

  if (nextClasses.length === 0) {
    await db.collection('students')
      .doc(student._id)
      .remove()

    return {
      success: true,
      student: null
    }
  }

  const nextDefaultClass = nextClasses[0]
  const nextStudent = {
    name: student.name,
    studentNo: student.studentNo,
    classId: nextDefaultClass.id,
    className: nextDefaultClass.name,
    classes: nextClasses
  }

  await db.collection('students')
    .doc(student._id)
    .update({
      data: {
        classId: nextDefaultClass.id,
        className: nextDefaultClass.name,
        classes: nextClasses,
        classIds: nextClasses.map((item) => item.id),
        updateTime: db.serverDate()
      }
    })

  return {
    success: true,
    student: nextStudent
  }
}

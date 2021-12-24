const mysql = require('mysql');
const nodemailer = require("nodemailer")
const schedule = require("node-schedule")
const config = {
  host: '[database url]',//mysql数据库域名/ip
  port: '3306',//mysql数据库端口,默认3306
  user: '[database user]',//数据库用户
  password: '[database password]',//数据库密码
  database: '[database name]',//数据库名称
  connectTimeout: 5000, //连接超时
  multipleStatements: false //是否允许一个query中包含多条sql语句
}

const user = "[send user]"//发件人邮箱
const pass = "[send user pass]"

//定义发件人
const transporter = nodemailer.createTransport({
  host: "smtp.qq.com",
  port: 587,
  secure: false,
  auth: {
    user: user,
    pass: pass
  },
});


async function sendMail() {
  //定义数据库连接
  let connection = mysql.createConnection(config);
  connection.connect();

  //封装数据库请求方法
  function asyncSql(sql) {
    return new Promise(resolve => {
      connection.query(sql, (err, result) => {
        if (err) throw err
        resolve(result)
      })
    })
  }

  //查询需要发送的用户
  const users = await asyncSql('SELECT * from EmailUser where del_flag=0')
  //获取发送条数和开始位置
  const emailConfig = await asyncSql('select * from emailconfig')
  let alreadyNo = +emailConfig.find(i => i.name === 'alreadyNo').value
  let pageSize = +emailConfig.find(i => i.name === 'pageSize').value
  //获取将要发送的图片地址
  const paths = await asyncSql(`select * from emailurl where id Between ${+alreadyNo} AND ${+alreadyNo+pageSize-1}`)
  let imgs = ''
  paths.forEach(i => imgs += `<img src="${i.url}" alt="">\n`)
  //更新开始位置
  await asyncSql(`UPDATE emailconfig SET value = ${alreadyNo+pageSize+''} WHERE name='alreadyNo'`)
  //遍历查询到的用户列表发送邮件
  users.map(async (i) => {
    await transporter.sendMail({
      from: `每日快乐源泉<${user}>`, // sender address
      to: i.emailAddress, // list of receivers
      subject: `${i.userName},今天也要元气满满哦`, // Subject line
      html: `
           <h2>亲爱的${i.userName},这是今日美图分享,今天也要开开心心的哦(*^▽^*)</h2>
          ${imgs}
           <h5 style="color: #ccc">退订:退订?退订是不可能退订的,这辈子都不可能的(\`へ´*)ノ,如果真的想退订请手动联系亲爱的付裕同学吧</h5>
           `
    });
    console.log(`${new Date()}---------${i.userName}已发送`)
  })
  //关闭数据库连接
  connection.end();
}

console.log("服务启动")
//开启每天九点半的定时任务
schedule.scheduleJob('0 30 9 * * *', () => {
  sendMail()
})

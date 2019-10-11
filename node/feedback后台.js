const http = require('http');
const fs = require('fs');
const template = require('art-template');
const formidable = require('formidable');

const server = http.createServer();

server.listen(5000, console.log('启动服务器成功！'))

server.on('request', (request, response) => {
    request.url !== '/favicon.ico' ? console.log('请求地址为：' + request.url) : null;

    if (request.url === '/feedback' || request.url === '/') {

        new Promise(resolve => {
            //打开主页面
            fs.readFile('../views/feedback.html', (err, data) => {
                if (err) throw new Error('打开feedback.html失败');
                resolve(data.toString());
            })
        }).then(htmlStr => {
            //读取json并渲染
            return new Promise(resolve => {
                fs.readFile('../public/json/notes.json', (err, json) => {
                    if (err) throw new Error('渲染时读取json出错：' + err)

                    json = JSON.parse(json.toString());
                    if (json.data[0]) {
                        //创建渲染时间戳json.data;并渲染到htmlStr
                        htmlStr = template.render(htmlStr, { notes: json.data });
                        resolve(htmlStr)
                    } else resolve(htmlStr)
                })
            })
        }).then(data => {
            response.setHeader("Content-Type", "text/html;charset=utf-8");
            response.end(data);
            return data
        }).then(htmlStr => {
            //将渲染后的html储存到index.html
            htmlStr = htmlStr.replace('_disabled','title="暂时还不能点噢~" disabled');
            fs.writeFile('../index.html', htmlStr, (err) => {
                if (err) throw new Error('重写index.html出错：' + err);
            })
        }).catch(err => console.error(err))

    } else if (request.url === '/feedback-notes') {
        //跳转至写留言页面
        fs.readFile('../views/feedback-notes.html', (err, data) => {
            if (err) return response.end('Cant Open File...');
            response.setHeader("Content-Type", "text/html;charset=utf-8");
            response.end(data);
        })
    } else if (request.url.startsWith('/public/')) {
        fs.readFile('..' + request.url, (err, data) => {
            if (err) {
                response.writeHead(404);
                response.end('404 Not Found');
            }
            response.end(data)
        })
    } else if (request.url === '/feedback-notes/commit') {
        //处理提交的form
        let form = new formidable.IncomingForm();
        form.parse(request, (err, field, files) => {
            if (err) {
                response.end();
                return console.error('解析失败');
            }

            //将field对象留言处理并写入json
            postJson(field).then(() => {
                //反馈success
                response.setHeader("Content-Type", "text/plain;charset=utf-8");
                response.write('success');
                response.end();
            }).catch(err => console.error(err))
        });
    } else if (request.url === '/favicon.ico') {
        fs.readFile('../public/img/favicon.ico', (err, data) => {
            if (err) {
                response.writeHead(404);
                response.end('404 Not Found');
            }
            response.end(data);
        })
    } else {
        response.writeHead(404);
        response.end('404 Not Found');
    }
})

const postJson = (newNote) => {
    return new Promise(resolve => {
        //异步读json
        fs.readFile('../public/json/notes.json', (err, data) => {
            if (err) throw new Error('读取json出错：' + err)
            resolve(JSON.parse(data.toString()));
        })
    }).then(json => {
        //给新增留言添加id
        newNote['id'] = json.data[0] ? json.data[0].id + 1 : 1;
        //新增创建时间给newNote
        newNote['createTime'] = + new Date();
        //新增留言到json
        json.data.unshift(newNote);
        //重写json
        return new Promise(resolve => {
            fs.writeFile('../public/json/notes.json', JSON.stringify(json), (err) => {
                if (err) throw new Error('重写json出错：' + err);
                resolve('留言插入成功~');
            })
        })
    }).then(info => console.log(info))
}
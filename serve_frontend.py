#!/usr/bin/env python3
"""
简单的静态文件服务器，用于提供前端构建文件，并代理API请求到后端
"""
import http.server
import socketserver
import os
import sys
import urllib.request
import urllib.error

# 默认端口
PORT = 8001

# 检查命令行参数
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        print(f"无效的端口号: {sys.argv[1]}")
        sys.exit(1)

# 前端构建目录
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "build")

# 后端API地址
BACKEND_API = "http://localhost:8002"

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # 添加CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        # 如果是API请求，代理到后端
        if self.path.startswith('/api/'):
            self.proxy_request('GET')
        # 如果是MinIO资源请求，代理到MinIO服务器
        elif self.path.startswith('/actor-avatars/') or self.path.startswith('/actor-photos/') or self.path.startswith('/actor-videos/') or self.path.startswith('/actor-media/'):
            print(f"检测到MinIO请求: {self.path}")
            self.proxy_minio_request('GET')
        # 对于任何其他路径，如果不是静态资源，都返回index.html
        elif not "." in self.path[1:] and self.path != "/":
            self.path = "/index.html"
            return super().do_GET()
        else:
            return super().do_GET()
    
    def do_POST(self):
        # 如果是API请求，代理到后端
        if self.path.startswith('/api/'):
            self.proxy_request('POST')
        else:
            self.send_error(404, "Not Found")
    
    def do_PUT(self):
        # 如果是API请求，代理到后端
        if self.path.startswith('/api/'):
            self.proxy_request('PUT')
        else:
            self.send_error(404, "Not Found")
    
    def do_DELETE(self):
        # 如果是API请求，代理到后端
        if self.path.startswith('/api/'):
            self.proxy_request('DELETE')
        else:
            self.send_error(404, "Not Found")
    
    def proxy_request(self, method):
        """代理请求到后端API"""
        # 重写API路径
        path = self.path
        if path.startswith('/api/v1/auth/'):
            path = path.replace('/api/v1/auth/', '/api/v1/system/auth/')
        
        target_url = f"{BACKEND_API}{path}"
        print(f"代理请求: {method} {self.path} -> {target_url}")
        
        # 读取请求体
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        
        # 创建请求
        req = urllib.request.Request(
            url=target_url,
            data=body,
            headers={k: v for k, v in self.headers.items() if k.lower() not in ['host', 'content-length']},
            method=method
        )
        
        try:
            # 发送请求到后端
            with urllib.request.urlopen(req) as response:
                # 返回响应
                self.send_response(response.status)
                
                # 复制响应头
                for header, value in response.getheaders():
                    if header.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(header, value)
                
                self.end_headers()
                
                # 复制响应体
                self.wfile.write(response.read())
        
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            
            # 复制错误响应头
            for header, value in e.headers.items():
                if header.lower() not in ['transfer-encoding', 'connection']:
                    self.send_header(header, value)
            
            self.end_headers()
            
            # 复制错误响应体
            self.wfile.write(e.read())
        
        except Exception as e:
            self.send_error(500, f"代理请求错误: {str(e)}")

    # 添加MinIO代理方法
    def proxy_minio_request(self, method):
        """代理请求到MinIO服务器"""
        # MinIO服务器地址
        MINIO_SERVER = "http://localhost:9000"
        
        target_url = f"{MINIO_SERVER}{self.path}"
        print(f"代理MinIO请求: {method} {self.path} -> {target_url}")
        
        # 创建请求
        req = urllib.request.Request(
            url=target_url,
            headers={k: v for k, v in self.headers.items() if k.lower() not in ['host', 'content-length']},
            method=method
        )
        
        try:
            # 发送请求到MinIO
            with urllib.request.urlopen(req) as response:
                # 返回响应
                self.send_response(response.status)
                
                # 复制响应头
                for header, value in response.getheaders():
                    if header.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(header, value)
                
                self.end_headers()
                
                # 复制响应体
                self.wfile.write(response.read())
        
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            
            # 复制错误响应头
            for header, value in e.headers.items():
                if header.lower() not in ['transfer-encoding', 'connection']:
                    self.send_header(header, value)
            
            self.end_headers()
            
            # 复制错误响应体
            self.wfile.write(e.read())
        
        except Exception as e:
            self.send_error(500, f"代理MinIO请求错误: {str(e)}")

if __name__ == "__main__":
    if not os.path.exists(DIRECTORY):
        print(f"错误: 目录不存在: {DIRECTORY}")
        print("请先构建前端项目: cd frontend && npm run build")
        sys.exit(1)
    
    print(f"启动静态文件服务器，端口: {PORT}，目录: {DIRECTORY}")
    print(f"API请求将代理到: {BACKEND_API}")
    
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"服务器运行在: http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")
            httpd.server_close() 
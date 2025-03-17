#!/usr/bin/env python3
"""
简单的端口转发脚本，将80端口转发到8002端口
"""
import socket
import threading
import sys

def handle_client(client_socket, remote_host, remote_port):
    """
    处理客户端连接，将数据转发到远程主机
    """
    # 连接到远程主机
    remote_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        remote_socket.connect((remote_host, remote_port))
        
        # 创建两个线程，分别处理客户端到远程主机和远程主机到客户端的数据转发
        client_to_remote = threading.Thread(target=forward, args=(client_socket, remote_socket))
        remote_to_client = threading.Thread(target=forward, args=(remote_socket, client_socket))
        
        client_to_remote.start()
        remote_to_client.start()
        
        # 等待线程结束
        client_to_remote.join()
        remote_to_client.join()
    except Exception as e:
        print(f"连接远程主机失败: {e}")
    finally:
        remote_socket.close()
        client_socket.close()

def forward(source, destination):
    """
    将数据从源套接字转发到目标套接字
    """
    try:
        while True:
            data = source.recv(4096)
            if not data:
                break
            destination.sendall(data)
    except Exception as e:
        print(f"转发数据时出错: {e}")

def main():
    """
    主函数
    """
    # 本地监听端口
    local_port = 80
    # 远程主机和端口
    remote_host = "127.0.0.1"
    remote_port = 8002
    
    try:
        # 创建服务器套接字
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        # 绑定到本地端口
        server.bind(("0.0.0.0", local_port))
        
        # 开始监听
        server.listen(5)
        print(f"端口转发已启动: 0.0.0.0:{local_port} -> {remote_host}:{remote_port}")
        
        # 接受客户端连接
        while True:
            client_socket, addr = server.accept()
            print(f"接受连接: {addr[0]}:{addr[1]}")
            
            # 为每个客户端创建一个新线程
            client_thread = threading.Thread(target=handle_client, args=(client_socket, remote_host, remote_port))
            client_thread.start()
    except Exception as e:
        print(f"服务器错误: {e}")
        sys.exit(1)
    finally:
        server.close()

if __name__ == "__main__":
    main() 
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"

# Workers: recommended formula is (2 × CPU cores) + 1
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers after this many requests (helps with memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Logging — write to stdout/stderr so Docker captures them
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

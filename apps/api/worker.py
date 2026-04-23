import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from redis import Redis
from rq import Queue
from rq.worker import SimpleWorker
from app.config import settings

if __name__ == "__main__":
    conn = Redis.from_url(settings.redis_url)
    queues = [Queue("default", connection=conn)]
    worker = SimpleWorker(queues, connection=conn)
    worker.work()

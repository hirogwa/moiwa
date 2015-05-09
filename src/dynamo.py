import settings
import os
from boto.dynamodb2.table import Table
from boto.dynamodb2.table import Item

os.environ['AWS_ACCESS_KEY_ID'] = settings.AWS_ACCESS_KEY_ID
os.environ['AWS_SECRET_ACCESS_KEY'] = settings.AWS_SECRET_ACCESS_KEY


def update(table_name, data):
    table = Table(table_name)
    item = Item(table, data=data)
    return item.save(overwrite=True)


def batch_write(table_name, collection):
    table = Table(table_name)
    with table.batch_write() as batch:
        for item in collection:
            batch.put_item(data=item)


def get_item(table_name, kwargs):
    table = Table(table_name)
    return table.get_item(kwargs)


def query(table_name, **kwargs):
    table = Table(table_name)
    return table.query_2(**kwargs)


def scan(table_name, **kwargs):
    table = Table(table_name)
    return table.scan()


def delete(table_name, kwargs):
    pass

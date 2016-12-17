import json
import _mysql

db=_mysql.connect(host="localhost", user="root", passwd="root", db="kw_db")

command = '''CREATE TABLE IF NOT EXISTS tweets0 (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    date BIGINT,
'''
sep = ''
for x in range(1496/2):
    command = command + '{1}kw{0} TINYINT(8) DEFAULT 0'.format(x, sep)
    sep = ','
command = command +')'
db.query(command)

command = '''CREATE TABLE IF NOT EXISTS tweets1 (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    date BIGINT,
'''
sep = ''
for x in range(1496/2):
    command = command + '{1}kw{0} TINYINT(8) DEFAULT 0'.format(x, sep)
    sep = ','
command = command +')'
db.query(command)

with open('kwall.json') as data_file:
    data = json.load(data_file)
    id = 1
    for d in data['data']:
        command = 'INSERT INTO tweets0 VALUES('
        values = d['values'][0:748]
        command = command + str(id)
        command = command +','+ str(d['date'])
        for v in values:
            command = command +','+str(v)
        command = command +')'
        print command
        db.query(command)

        command = 'INSERT INTO tweets1 VALUES('
        values = d['values'][748:]
        command = command + str(id)
        command = command +','+ str(d['date'])
        for v in values:
            command = command +','+str(v)
        command = command +')'
        print command
        db.query(command)
        id += 1

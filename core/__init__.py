import pymysql

# PyMySQL se fait passer pour MySQLdb afin d'être compatible avec Django
pymysql.install_as_MySQLdb()

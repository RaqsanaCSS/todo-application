### The idea 

I created 2 digital ocean droplets. One of them is for database and another is for web application. I wrote Firewall rule so only web application can connect database server to read and write data with only newly created ansibleuser user because root user cannot login externally it is allowed to login database locally only.

## Database configuration and ansible automation


Firstly, I installed mysql server and python3-pymysql using ansible after authenticating droplet using private ssh key (id_rsa).

The `python3-pymysql` package is a Python MySQL driver that is often used by Ansible's `mysql_db` and `mysql_user` modules to interact with the MySQL database. Ansible uses it to execute SQL commands and manage database state.

I used local .my.conf authentication file to authenticate database.  One time, because of error I couldn't solve, I used password authentication. Using copy module of ansible I copied file to the droplet.

Firstly, I changed mysql root password using mysql_user with the help of python3-pymysql package and allowed only localhost access. I grant all privileges on all databases to root user.  

```ansible
- name: Change root user authentication to mysql_native_password
  mysql_user:
    login_unix_socket: /var/run/mysqld/mysqld.sock
    name: root
    host: localhost
    password: "{{ mysql_root_password }}"
    priv: '*.*:ALL,GRANT'
    state: present
    append_privs: yes
    check_implicit_admin: yes
    plugin: mysql_native_password
```

I removed anonymous mysql users I don't need them.

```ansible
- name: Remove anonymous MySQL users using .my.cnf
  mysql_user:
    config_file: /root/.my.cnf
    name: ''
    host_all: yes
    state: absent
```

I create ansible database for web application to interact. mysql_db variable is from mysql_vars.yml which is encrypted using ansible-vault with the most secure password in the world (temppass123).

```ansible
- name: Create a new MySQL database using .my.cnf
  mysql_db:
    config_file: /root/.my.cnf
    name: "{{ mysql_db }}"
    state: present
```

I created ansible user for web application 

```ansible
- name: Create 'ansibleuser' with all privileges on 'ansible' database using .my.cnf
  mysql_user:
    config_file: /root/.my.cnf
    name: "{{ mysql_user }}"
    password: "{{ mysql_password }}"
    host: '%'
    priv: "ansible.*:ALL"
    state: present
```

I only give access on ansible database and allowed accessing from external hosts using % wildcard.


For external access to database bind address must be changed from 127.0.0.1 to 0.0.0.0.

```ansible
- name: Update MySQL bind address in my.cnf
  ansible.builtin.lineinfile:
    path: /etc/mysql/mysql.conf.d/mysqld.cnf
    regexp: '^bind-address\s*=\s*127\.0\.0\.1'
    line: 'bind-address = 0.0.0.0'
    backup: yes
```

I have users and tasks tables for web application I wrote sql query to create these tables in database and copied this file to the droplet to include in mysql.
script.sql
```sql
use ansible;

create table if not exists users (
    id int not null primary key auto_increment,
    username text not null,
    email text not null,
    password text not null
);

CREATE TABLE if not exists tasks (
    id INT not null primary key auto_increment,
    title varchar(255) not null,
    description text not null,
    owner_id int not null,
    FOREIGN KEY(owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
```

```
- name: Copy 'users' and 'tasks' tables creation script
  copy:
    src: ../templates/tables.sql
    dest: /tmp/tables.sql
- name: Create tables using root credentials from .my.cnf
  mysql_db:
    config_file: /root/.my.cnf
    name: "{{ mysql_db }}"
    state: import
    target: /tmp/tables.sql
```

After setting all configurations I restarted mysql service.

```ansible
- name: Restart MySQL service
  service:
    name: mysql
    state: restarted
    enabled: yes
```


## Web application

I created todo creation application using node.js express framework in mvc format. 

This is the structure of the application

![[Pasted image 20231120093140.png]]

I connect database using config/database.js file 

```
const mysql = require('mysql2');
require('dotenv').config()
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

module.exports = pool;
```

I have local .env file so I had to create the same one in the digital ocean droplet I used ansible for this.

```ansible
DB_HOST={{ DB_HOST }}
DB_USER={{ DB_USER }}
DB_PASSWORD={{ DB_PASSWORD }}
DB_DATABASE= {{ DB_DATABASE }}
```

All variables values are taken from mysql_vars.yml file which is encrypted using ansible-vault.

To create docker image of this application I wrote Dockerfile
```Dockerfile
FROM node:16 

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "run", "start"]
```

I pull node:16 image and create workdir as /app. Copying packages to install npm packes using command npm install. After installing packages I copied all files to the directory. I run npm run start which is defined in package.json equals to nodemon app.js

```javascript
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "nodemon app.js"
  },
```

I had to transfer this files to the droplet I decided that push it to github and cloning it from there is the best way. So I created private repository https://github.com/accap3035/todo-app-devops.git

## Cloning and building web app image

To clone application and build it I had to install docker npm nodejs and git to webserver droplet.

```ansible
- name: Install Docker.io, Node.js, npm, and Git
  apt:
    name:
      - docker.io
      - nodejs
      - npm
      - git
    state: present
```

Since my repository is private I had to authenticate git then clone it I used authentication git using github access key
```
- name: Clone the private repository from GitHub
  command: git clone https://{{ github_access_token }}:x-oauth-basic@{{ github_repo_url }} {{ app_directory }}
  args:
    creates: "{{ app_directory }}/.git"
```

All variables are stored in deploy_vars.yml and encrypted using ansible-vault

I used dotenv for configuration of database connection in database.js I copied it using following ansible code block

```ansible
- name: Copy env.j2 template to remote .env
  template:
    src: roles/todo-app/templates/env.j2
    dest: "{{ app_directory }}/.env"
```

Then I build docker image firstly after stopping running docker container
```ansible
- name: Stop existing Docker container
  command: docker rm -f "{{ docker_container_name }}"
  ignore_errors: no
```

```ansible
- name: Build Docker image from Dockerfile
  command: docker build -t "{{ docker_image_name }}" "{{ app_directory }}"
```

As the last step to deploy application I run docker image exposing 3000 port to 80 all are as variables in deploy_vars.yml

```ansible
- name: Run Docker container from image
  command: docker run -d --name "{{ docker_container_name }}" -p "{{ host_port }}:{{ app_port }}" "{{ docker_image_name }}"
```


**Finally I run these commands to run ansible scripts:**

```
Database:

ansible-playbook -i hosts mysql-playbook.yml --ask-vault-pass

Web application:

ansible-playbook -i hosts deploy-app.yml --ask-vault-pass
```

Ansible files:

https://github.com/accap3035/ansible-files


**Note: I will give you access to view private repos**

## CI / CD PIPELINE

I have two stages testing and deploying. During testing stage I tested that webserver can access database or not. Since I have rule for database server that only webserver can access database I created bash script for testing and save it in pipeline variables then I added ssh private key to my ssh agent. After login the webserver I run test bash script to check database is accessible or not if it is I move on deploy stage. 

During deployment stage I also add ssh private key to my ssh agent in order to stop providing id_rsa to ansible-playbook. Since my ansible files are in github to clone them I installed git and to run them I installed ansible. Decrypting vault protected variable files I created file storing vault password in order not to use --ask-vault-pass because it breaks pipeline. Then I cloned ansible files from github using access token. At the end I run ansible playbook which enters webserver clone, build and run docker image.

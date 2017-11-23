#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const {exec} = require("child_process");
const md5 = require('md5');
const {HOME} = process.env;
const cwd = process.cwd();
const configPath = path.resolve(HOME, '.smart-install-config.json');
const pkgPath = path.resolve(cwd, 'package.json');
const pkgLockPath = path.resolve(cwd, 'package-lock.json');

const checkData = checkPackage();
if (!checkData) {
  throw new Error(`当前目录:${cwd}未找到package.json文件，无法安装依赖包`);
}
isNeedInstall(checkData);

// 获取配置
function getConfigData() {
  if (!fs.existsSync(configPath)) {
    setConfigData({});
    return {};
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// 设置配置
function setConfigData(data) {
  fs.writeFileSync(configPath, JSON.stringify(data));
  console.log(`配置文件已更新:${configPath}`);
}

// 判断package.json是否存在
function checkPackage() {
  if (fs.existsSync(pkgLockPath)) {
    return {name: 'package-lock.json', jsonPath: pkgLockPath}
  } else if (fs.existsSync(pkgPath)) {
    return {name: 'package.json', jsonPath: pkgPath}
  } else {
    return false;
  }
}

function isNeedInstall({name, jsonPath}) {
  const data = getConfigData();
  const currentMd5 = md5(fs.readFileSync(jsonPath));
  if (!data[jsonPath] || !data[jsonPath][name]) {
    runInstall(data, jsonPath, currentMd5, name);
  } else {
    const jsonDataMd5 = data[jsonPath][name];
    if (currentMd5 === jsonDataMd5) {
      console.log('当前已安装最新依赖，已跳过npm install');
    } else {
      runInstall(data, jsonPath, currentMd5, name)
    }
  }
}

// 设置md5
function setMd5(data, jsonPath, currentMd5, name) {
  if (!data[jsonPath]) {
    data[jsonPath] = {};
  }
  data[jsonPath][name] = currentMd5;
  setConfigData(data);
}

// 安装依赖包
function runInstall(data, jsonPath, currentMd5, name) {
  console.log('开始执行npm install')
  exec('npm install', (err, stdout, stderr) => {
    if (err) {
      return console.log('err', err);
    }
    // if (stderr) {   return console.log('npm install 失败', stderr); }
    console.log(stdout);
    setMd5(data, jsonPath, currentMd5, name)
  })
}
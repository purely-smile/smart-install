#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const md5 = require("md5");
const { HOME } = process.env;
const cwd = process.cwd();
const configPath = path.resolve(HOME, ".smart-install-config.json");
const pkgPath = path.resolve(cwd, "package.json");
const pkgLockPath = path.resolve(cwd, "package-lock.json");

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
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

// 设置配置
function setConfigData(data) {
  fs.writeFileSync(configPath, JSON.stringify(data));
  console.log(`配置文件已更新:${configPath}`);
}

// 判断package.json是否存在
function checkPackage() {
  if (fs.existsSync(pkgLockPath)) {
    return { name: "package-lock.json", jsonPath: pkgLockPath };
  } else if (fs.existsSync(pkgPath)) {
    return { name: "package.json", jsonPath: pkgPath };
  } else {
    return false;
  }
}

function isNeedInstall({ name, jsonPath }) {
  const data = getConfigData();
  const currentMd5 = md5(fs.readFileSync(jsonPath));
  if (!data[cwd] || !data[cwd][name]) {
    runInstall(data, currentMd5, name);
  } else {
    const jsonDataMd5 = data[cwd][name];
    if (currentMd5 === jsonDataMd5) {
      console.log("当前已安装最新依赖，已跳过npm install");
    } else {
      runInstall(data, currentMd5, name);
    }
  }
}

// 设置md5
function setMd5(data, currentMd5, name) {
  if (!data[cwd]) {
    data[cwd] = {};
  }
  data[cwd][name] = currentMd5;
  setConfigData(data);
}

// 安装依赖包
function runInstall(data, currentMd5, name) {
  console.log("开始执行npm install");
  const install = spawn("npm install", {
    shell: true
  });
  install.stdout.on("data", function(data) {
    console.log(data.toString());
  });

  install.stderr.on("data", function(data) {
    console.log("stderr: " + data.toString());
  });

  install.on("exit", function(code) {
    if (code === 0) {
      setMd5(data, currentMd5, name);
    }
    console.log("child process exited with code " + code.toString());
  });
}

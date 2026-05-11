//new Env("ks_dual")


const axios = require("axios");
const querystring = require("querystring");
const { SocksProxyAgent } = require("socks-proxy-agent");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "114.114.114.114", "223.5.5.5"]);

// ==============================================
// 自定义签名接口：KUAISHOU=81端口  NEBULA=82端口
// ==============================================
const SIGN_API_KUAISHOU = "http://127.0.0.1:81"; // 普通版(kpn=KUAISHOU)
const SIGN_API_NEBULA = "http://127.0.0.1:82";   // 极速版(kpn=NEBULA)
console.log("💡 普通版签名API: " + SIGN_API_KUAISHOU);
console.log("💡 极速版签名API: " + SIGN_API_NEBULA);

// 全局配置（原配置未改动）
const CONFIG = {
  SEARCH_KEYWORDS: process.env.KS_SEARCH_KEYWORDS?.split(",") || ["短剧小说", "热门视频", "美食教程"],
  DEFAULT_TASKS: process.env.KS_DEFAULT_TASKS?.split(",") || ["box", "look", "food", "search"],
  CYCLE_ROUNDS: parseInt(process.env.KS_CYCLE_ROUNDS || 0),
  WATCH_MIN: parseInt(process.env.KS_WATCH_MIN || 30),
  WATCH_MAX: parseInt(process.env.KS_WATCH_MAX || 40),
  AD_FAIL_LIMIT: parseInt(process.env.KS_AD_FAIL_LIMIT || 10),
  CONTINUOUS_1COIN_LIMIT: parseInt(process.env.KS_CONTINUOUS_1COIN_LIMIT || 3),
  APPEND_REST_INTERVAL: parseInt(process.env.KS_APPEND_INTERVAL || 5),
  APPEND_REST_MIN: parseInt(process.env.KS_APPEND_MIN || 5000),
  APPEND_REST_MAX: parseInt(process.env.KS_APPEND_MAX || 10000),
  LOW_REWARD_THRESHOLD: parseInt(process.env.KS_LOW_REWARD_THRESHOLD || 10),
  LOW_REWARD_LIMIT: parseInt(process.env.KS_LOW_REWARD_LIMIT || 3),
  PLATFORM_CONFIG: {
    KUAISHOU: {
      name: "KS",
      accountInfoUrl: "https://encourage.kuaishou.com/rest/wd/encourage/account/basicInfo",
      host: "encourage.kuaishou.com",
      appId: "kuaishou",
      packageName: "com.smile.gifmaker",
      appName: "快手",
      displayName: "快手",
      kpn: "KUAISHOU",
      adClientKey: "3c2cd3f3",
      reportClientKey: "3c2cd3f3"
    },
    NEBULA: {
      name: "JSB",
      accountInfoUrl: "https://nebula.kuaishou.com/rest/n/nebula/activity/earn/overview/basicInfo",
      host: "nebula.kuaishou.com",
      appId: "kuaishou_nebula",
      packageName: "com.kuaishou.nebula",
      appName: "快手极速版",
      displayName: "快手极速版",
      kpn: "NEBULA",
      adClientKey: "2ac2a76d",
      reportClientKey: "2ac2a76d"
    }
  },
  TASK_CONFIGS: {
    KUAISHOU: {
      box: {
        name: "宝箱广告",
        businessId: 604, posId: 20345, subPageId: 100024063,
        requestSceneType: 1, taskType: 1, pageId: 100011251
      },
      look: {
        name: "看广告得金币",
        businessId: 671, posId: 24068, subPageId: 100026368,
        requestSceneType: 1, taskType: 1, pageId: 100011251
      },
      food: {
        name: "饭补广告",
        businessId: 921, posId: 29742, subPageId: 100029908,
        requestSceneType: 7, taskType: 2, pageId: 100011251
      },
      search: {
        name: "搜索广告",
        businessId: 7077, posId: 216267, subPageId: 100161535,
        pageId: 10014, requestSceneType: 1, taskType: 2,
        linkUrl: "eyJwYWdlSWQiOjEwMDE0LCJzdWJQYWdlSWQiOjEwMDE2MTUzNSwicG9zSWQiOjIxNjI2NywiYnVzaW5lc3NJZCI6NzA3NywiZXh0UGFyYW1zIjoiYzc4OWI1ZTAzMjMxOTUwZjcyM2ZjMWE1ZGJjYzgwNmYzMDE1OTcyZWE0Mzc2NmNlNDYwNTk2ZDgzMGVjNTE5MDM0OGEwNTlkOTA2NWYwZGY1ZjkwY2YwMjEwMGVhMmQzYzU0YjUyZDBlNGUxY2Q0NmMxN2ExZDU3YmRhY2EyMzVlM2U1NjYzN2JmZGQzMThiZWMzNTgzOWU1YzIxNWUyNzMzY2IyMzQ2ZGQ1NDYyODc1NDdlMjc4OWYxMjZjZWU5NWZhYzg4N2IxMzM2MzBlZTEzYTVmYTlhODYzNDYxODQ5MjM0NDk3ZGY3ZTRmOWYyYzk2ZjQ5YzViMGExNzQ2NGE2MGM0MDg1MzU2NTY2ZDc4NGIxYjY3NzY3MzYzYjg3IiwiY3VzdG9tRGF0YSI6eyJleGl0SW5mbyI6eyJ0b2FzdERlc2MiOm51bGwsInRvYXN0SW1nVXJsIjpudWxsfX0sInBlbmRhbnRUeXBlIjoxLCJkaXNwbGF5VHlwZSI6Miwic2luZ2xlUGFnZUlkIjowLCJzaW5nbGVTdWJQYWdlSWQiOjAsImNoYW5uZWwiOjAsImNvdW50ZG93blJlcG9ydCI6ZmFsc2UsInRoZW1lVHlwZSI6MCwibWl4ZWRBZCI6dHJ1ZSwiZnVsbE1peGVkIjp0cnVlLCJhdXRvUmVwb3J0Ijp0cnVlLCJmcm9tVGFza0NlbnRlciI6dHJ1ZSwic2VhcmNoSW5zcGlyZVNjaGVtZUluZm8iOm51bGwsImFtb3VudCI6MH0="
      }
    },
    NEBULA: {
      box: {
        name: "宝箱广告",
        pageId: 11101, subPageId: 100024064, businessId: 606, posId: 20346,
        requestSceneType: 1, taskType: 1
      },
      look: {
        name: "看广告得金币",
        pageId: 11101, subPageId: 100026367, businessId: 672, posId: 24067,
        requestSceneType: 1, taskType: 1
      },
      food: {
        name: "饭补广告",
        pageId: 11101, subPageId: 100026367, businessId: 9362, posId: 24067,
        requestSceneType: 7, taskType: 2
      },
      search: {
        name: "搜索广告",
        pageId: 11014, subPageId: 100161537, businessId: 7076, posId: 216268,
        requestSceneType: 1, taskType: 1,
        linkUrl: "eyJwYWdlSWQiOjExMDE0LCJzdWJQYWdlSWQiOjEwMDE2MTUzNywicG9zSWQiOjIxNjI2OCwiYnVzaW5lc3NJZCI6NzA3NiwiZXh0UGFyYW1zIjoiYjc4OWI1ZTAzMjMxOTUwZjcyM2ZjMWE1ZGJjYzgwNmYzMDE1OTcyZWE0Mzc2NmNlNDYwNTk2ZDgzMGVjNTE5MDM0OGEwNTlkOTA2NWYwZGY1ZjkwY2YwMjEwMGVhMmQzYzU0YjUyZDBlNGUxY2Q0NmMxN2ExZDU3YmRhY2EyMzVlM2U1NjYzN2JmZGQzMThiZWMzNTgzOWU1YzIxNWUyNzMzY2IyMzQ2ZGQ1NDYyODc1NDdlMjc4OWYxMjZjZWU5NWZhYzg4N2IxMzM2MzBlZTEzYTVmYTlhODYzNDYxODQ5MjM0NDk3ZGY3ZTRmOWYyYzk2ZjQ5YzViMGExNzQ2NGE2MGM0MDg1MzU2NTY2ZDc4NGIxYjY3NzY3MzYzYjg3IiwiY3VzdG9tRGF0YSI6eyJleGl0SW5mbyI6eyJ0b2FzdERlc2MiOm51bGwsInRvYXN0SW1nVXJsIjpudWxsfX0sInBlbmRhbnRUeXBlIjoxLCJkaXNwbGF5VHlwZSI6Miwic2luZ2xlUGFnZUlkIjowLCJzaW5nbGVTdWJQYWdlSWQiOjAsImNoYW5uZWwiOjAsImNvdW50ZG93blJlcG9ydCI6ZmFsc2UsInRoZW1lVHlwZSI6MCwibWl4ZWRBZCI6dHJ1ZSwiZnVsbE1peGVkIjp0cnVlLCJhdXRvUmVwb3J0Ijp0cnVlLCJmcm9tVGFza0NlbnRlciI6dHJ1ZSwic2VhcmNoSW5zcGlyZVNjaGVtZUluZm8iOm51bGwsImFtb3VudCI6MH0="
      },
      follow: {
        name: "关注广告",
        pageId: 11101, subPageId: 100026367, businessId: 672, posId: 24067,
        requestSceneType: 2, taskType: 1
      },
      content: {
        name: "内容广告",
        pageId: 11101, subPageId: 100141480, businessId: 7054, posId: 186550,
        requestSceneType: 1, taskType: 1
      }
    }
  }
};
let localPublicIP = null;

// ==============================================
// 工具函数（原代码未改动）
// ==============================================
function getTime() {
  return new Date().toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai", hour12: false,
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}
function getProxyTag(useProxy) { return useProxy ? "[代理]" : "[直连]"; }
function maskProxyUrl(proxy) {
  if (!proxy) return null;
  try {
    const match = proxy.match(/^(socks5:\/\/)([^:@]+)(?::([^@]+))?@(.+)$/);
    if (match) {
      const [, protocol, user, , host] = match;
      return `${protocol}${user}:***@${host}`;
    }
  } catch (e) {}
  return proxy;
}
function log(useProxy, appName, msg) {
  const tag = getProxyTag(useProxy);
  const app = appName === "快手极速版" ? "快手极速版" : "快手";
  console.log(`${tag}<${app}>(${getTime()}): ${msg}`);
}
function print(msg) { console.log(msg); }

// ==============================================
// 网络请求封装（原代码未改动）
// ==============================================
async function request(options, proxy = null, title = "请求") {
  try {
    const axiosOptions = {
      method: options.method || "GET",
      url: options.url,
      headers: options.headers || {},
      data: options.body || options.form,
      timeout: options.timeout || 12000,
      validateStatus: () => true
    };
    if (proxy) {
      const agent = new SocksProxyAgent(proxy, { timeout: 10000, keepAlive: false });
      axiosOptions.httpAgent = agent;
      axiosOptions.httpsAgent = agent;
    } else {
      axiosOptions.proxy = false;
    }
    if (options.form && options.method === "POST" && !axiosOptions.headers["Content-Type"]) {
      axiosOptions.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      axiosOptions.data = querystring.stringify(options.form);
    }
    const resp = await axios(axiosOptions);
    return { body: resp.data, status: resp.status };
  } catch (e) {
    console.log(`[请求失败] ${title}: ${e.message}`);
    return { body: null, status: 0 };
  }
}
async function checkLocalIP() {
  print("正在检测本地直连公网IP...");
  const urls = ["http://icanhazip.com", "http://ipinfo.io/ip", "http://httpbin.org/ip"];
  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 5000, responseType: "text", proxy: false });
      const ip = res.data.trim().match(/\d+\.\d+\.\d+\.\d+/)?.[0];
      if (ip) {
        localPublicIP = ip;
        print("本地直连公网IP: " + ip);
        return ip;
      }
    } catch (e) { continue; }
  }
  print("本地直连公网IP检测失败");
  process.exit(1);
}
async function checkProxyIP(proxy) {
  const urls = ["http://icanhazip.com", "http://ipinfo.io/ip", "http://httpbin.org/ip"];
  for (const url of urls) {
    try {
      const { body } = await request({ method: "GET", url, timeout: 8000 }, proxy, "代理IP检测");
      if (!body) continue;
      const ip = body.toString().trim().match(/\d+\.\d+\.\d+\.\d+/)?.[0];
      if (ip) return ip;
    } catch (e) { continue; }
  }
  return null;
}

// ==============================================
// 签名接口 - 核心修改：按kpn自动切换接口
// ==============================================
async function getEncSign(base64Data, proxy, appName, remark, kpnType) {
  // 按kpn选签名接口：KUAISHOU=81  NEBULA=82
  const SIGN_API_URL = kpnType === "KUAISHOU" ? SIGN_API_KUAISHOU : SIGN_API_NEBULA;
  try {
    const { body } = await request({
      method: "POST",
      url: SIGN_API_URL + "/encsign",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({ data: base64Data }),
      timeout: 15000
    }, null, `获取加密签名`);
    if (body && body.status) return body.data;
    log(proxy, appName, `❌ ${remark} encsign 失败: ${body?.message || body?.error || "无响应"}`);
    return null;
  } catch (e) {
    log(proxy, appName, `❌ ${remark} encsign 异常: ${e.message}`);
    return null;
  }
}
async function getNsSign(reqInfo, proxy, appName, remark, kpnType) {
  // 按kpn选签名接口：KUAISHOU=81  NEBULA=82
  const SIGN_API_URL = kpnType === "KUAISHOU" ? SIGN_API_KUAISHOU : SIGN_API_NEBULA;
  try {
    const payload = {
      path: reqInfo.urlpath,
      data: reqInfo.reqdata,
      salt: reqInfo.salt
    };
    const { body } = await request({
      method: "POST",
      url: SIGN_API_URL + "/nssig",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify(payload),
      timeout: 15000
    }, null, `获取nssig签名`);
    if (body && body.data) {
      return {
        sig: body.data.sig,
        __NStokensig: body.data.nstokensig,
        __NS_sig3: body.data.nssig3,
        __NS_xfalcon: body.data.nssig4 || body.data.xfalcon || ""
      };
    }
    log(proxy, appName, `❌ ${remark} nssig 失败: ${body?.error || body?.message || "无响应"}`);
    return null;
  } catch (e) {
    log(proxy, appName, `❌ ${remark} nssig 异常: ${e.message}`);
    return null;
  }
}

// ==============================================
// 账号信息获取（原代码未改动）
// ==============================================
async function getUserInfo(cookie, platform, proxy) {
  try {
    const { body } = await request({
      method: "GET",
      url: platform.accountInfoUrl,
      headers: {
        Host: platform.host,
        "User-Agent": "kwai-android aegon/3.56.0",
        Cookie: cookie,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 12000
    }, proxy, "获取账号信息");
    if (body && body.result === 1 && body.data) {
      let coin = 0, cash = 0;
      if (platform.name === "KS") {
        coin = Number(body.data.coinAmount) || 0;
        cash = Number(body.data.cashAmountDisplay) || 0;
      } else {
        coin = Number(body.data.totalCoin) || 0;
        cash = Number(body.data.allCash) || 0;
      }
      return {
        nickname: body.data.userData?.nickname || null,
        totalCoin: coin, allCash: cash,
        success: true, ckExpired: false
      };
    }
    return { nickname: null, totalCoin: 0, allCash: 0, success: false, ckExpired: true };
  } catch (e) {
    return { nickname: null, totalCoin: 0, allCash: 0, success: false, ckExpired: true };
  }
}

// ==============================================
// 账号任务类 - 仅传kpnType到签名函数，其余未改
// ==============================================
class KuaishouAccount {
  constructor({ index = 1, salt, cookie, remark = "未命名", proxyUrl = null, tasksToExecute = CONFIG.DEFAULT_TASKS }) {
    this.index = index;
    this.salt = salt;
    this.cookie = cookie;
    this.remark = remark;
    this.proxyUrl = proxyUrl;
    this.platform = this.getPlatformByCookie(cookie);
    this.kpnType = this.platform.kpn; // 新增：获取kpn类型(KUAISHOU/NEBULA)
    this.tasksToRun = tasksToExecute.filter(Boolean);
    this.taskConfigs = CONFIG.TASK_CONFIGS[this.platform.kpn === "NEBULA" ? "NEBULA" : "KUAISHOU"];
    this.lowRewardCount = 0;
    this.lowRewardStreak = 0;
    this.adFailCount = 0;
    this.continuous1Coin = 0;
    this.stopAll = false;
    this.taskStats = {};
    this.taskLimit = {};
    this.taskDisabled = {};
    this.tasksToRun.forEach(task => {
      this.taskStats[task] = { success: 0, failed: 0, totalReward: 0 };
      this.taskLimit[task] = false;
      this.taskDisabled[task] = false;
    });
    this.isCycleMode = CONFIG.CYCLE_ROUNDS > 0;
    this.cycleRounds = CONFIG.CYCLE_ROUNDS;
    this.currentRound = 0;
    this.currentTaskIndex = 0;
    this.parseCookie();
    this.clientIP = null;
  }
  getPlatformByCookie(cookie) {
    const match = cookie.match(/kpn=([^;]+)/);
    const kpn = match ? match[1].toUpperCase() : "KUAISHOU";
    return kpn === "NEBULA" ? CONFIG.PLATFORM_CONFIG.NEBULA : CONFIG.PLATFORM_CONFIG.KUAISHOU;
  }
  parseCookie() {
    try {
      this.mod = this.cookie.match(/mod=([^;]+)/)?.[1] || "Xiaomi(23116PN5BC)";
      this.egid = this.cookie.match(/egid=([^;]+)/)?.[1] || "";
      this.did = this.cookie.match(/did=([^;]+)/)?.[1] || "";
      this.userId = this.cookie.match(/userId=([^;]+)/)?.[1] || "";
      this.apiSt = this.cookie.match(/kuaishou\.api_st=([^;]+)/)?.[1] || "";
      this.appver = this.cookie.match(/appver=([^;]+)/)?.[1] || "13.7.20.10468";
      this.queryParams = `mod=${this.mod}&appver=${this.appver}&egid=${this.egid}&did=${this.did}`;
    } catch (e) {
      log(this.proxyUrl, this.platform.displayName, `${this.remark} 解析cookie失败: ${e.message}`);
    }
  }
  async initIP() {
    try {
      if (this.proxyUrl) {
        log(null, this.platform.displayName, `账号 [${this.remark}] 代理: ${maskProxyUrl(this.proxyUrl)}`);
        const ip = await checkProxyIP(this.proxyUrl);
        if (!ip) {
          this.stopAll = true;
          log(this.proxyUrl, this.platform.displayName, `${this.remark} 初始化失败：代理IP检测无有效结果`);
          return;
        }
        this.clientIP = ip;
        log(this.proxyUrl, this.platform.displayName, `${this.remark} 代理出口IP: ${ip}`);
      } else {
        if (!localPublicIP) await checkLocalIP();
        this.clientIP = localPublicIP;
      }
    } catch (e) {
      this.stopAll = true;
      log(this.proxyUrl, this.platform.displayName, `${this.remark} 初始化失败：${e.message}`);
    }
  }
  async retry(fn, desc, times = 3, delay = 2000) {
    let cnt = 0;
    while (cnt < times && !this.stopAll) {
      try {
        const res = await fn();
        if (res) return res;
      } catch (e) {}
      cnt++;
      if (cnt < times && !this.stopAll) await new Promise(r => setTimeout(r, delay));
    }
    return null;
  }
  getImpExt(task) {
    if (task.name.includes("搜索")) {
      const word = CONFIG.SEARCH_KEYWORDS[Math.floor(Math.random() * CONFIG.SEARCH_KEYWORDS.length)];
      return JSON.stringify({
        openH5AdCount: 2,
        sessionLookedCompletedCount: "1",
        sessionType: "1",
        searchKey: word,
        triggerType: "2",
        disableReportToast: "true",
        businessEnterAction: "7",
        neoParams: task.linkUrl || ""
      });
    }
    return "{}";
  }
  async getAdInfo(taskKey) {
    const task = this.taskConfigs[taskKey];
    if (!task) return null;
    const adUrl = "/rest/e/reward/mixed/ad";
    const commonData = {
      encData: "|encData|",
      sign: "|sign|",
      cs: "false",
      client_key: this.platform.adClientKey,
      videoModelCrowdTag: "1_23",
      os: "android",
      "kuaishou.api_st": this.apiSt,
      uQaTag: "1##swLdgl:99#ecPp:-9#cmNt:-0#cmHs:-3#cmMnsl:-0"
    };
    const deviceData = {
      earphoneMode: "1", mod: this.mod, appver: this.appver,
      isp: "CUCC", language: "zh-cn", ud: this.userId,
      did_tag: "0", net: "WIFI", kcv: "1599", app: "0",
      kpf: "ANDROID_PHONE", ver: "11.6", android_os: "0",
      boardPlatform: "pineapple", kpn: this.platform.kpn,
      androidApiLevel: "35", country_code: "cn", sys: "ANDROID_15",
      sw: "1080", sh: "2400", abi: "arm64", userRecoBit: "0"
    };
    const impData = {
      appInfo: {
        appId: this.platform.appId, name: this.platform.appName,
        packageName: this.platform.packageName, version: this.appver, versionCode: -1
      },
      deviceInfo: { osType: 1, osVersion: "15", deviceId: this.did, screenSize: { width: 1080, height: 2249 }, ftt: "" },
      userInfo: { userId: this.userId, age: 0, gender: "" },
      impInfo: [{
        pageId: task.pageId || 100011251,
        subPageId: task.subPageId,
        action: 0,
        browseType: task.name.includes("搜索") ? 4 : 3,
        impExtData: this.getImpExt(task),
        mediaExtData: "{}"
      }]
    };
    const base64Imp = Buffer.from(JSON.stringify(impData)).toString("base64");
    // 传kpnType到签名函数
    const encSign = await this.retry(
      () => getEncSign(base64Imp, this.proxyUrl, this.platform.displayName, this.remark, this.kpnType),
      "获取广告加密签名"
    );
    if (!encSign) return null;
    commonData.encData = encSign.encdata;
    commonData.sign = encSign.sign;
    // 传kpnType到签名函数
    const nsSign = await this.retry(
      () => getNsSign({
        urlpath: adUrl,
        reqdata: querystring.stringify(commonData) + "&" + querystring.stringify(deviceData),
        salt: this.salt
      }, this.proxyUrl, this.platform.displayName, this.remark, this.kpnType),
      "获取广告请求nssig"
    );
    if (!nsSign) return null;
    const reqQuery = {
      ...deviceData,
      sig: nsSign.sig,
      __NS_sig3: nsSign.__NS_sig3,
      __NS_xfalcon: nsSign.__NS_xfalcon,
      __NStokensig: nsSign.__NStokensig
    };
    const finalUrl = "https://api.e.kuaishou.com" + adUrl + "?" + querystring.stringify(reqQuery);
    const { body } = await request({
      method: "POST",
      url: finalUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Host: "api.e.kuaishou.com",
        "User-Agent": "kwai-android aegon/3.56.0",
        Cookie: this.cookie
      },
      form: commonData,
      timeout: 12000
    }, this.proxyUrl, "获取广告");
    if (!body) {
      this.adFailCount++;
      if (this.adFailCount >= CONFIG.AD_FAIL_LIMIT) this.stopAll = true;
      return null;
    }
    if (body.errorMsg === "OK" && body.feeds?.[0]?.ad) {
      const ad = body.feeds[0];
      const title = (ad.caption || ad.ad?.caption || "").slice(0, 30) + "...";
      let coin = 0;
      try {
        const ext = JSON.parse(ad.ad.extData);
        coin = Number(ext.awardCoin) || 0;
        if (coin === 0) {
          coin = ad.ad.adDataV2?.inspirePersonalize?.awardValue ||
                 ad.ad.adDataV2?.inspireAdInfo?.inspirePersonalize?.neoValue || 0;
        }
      } catch (e) {}
      if (coin === 5) return null;
      log(this.proxyUrl, this.platform.displayName, `${this.remark} 获取广告成功：${title}`);
      log(null, this.platform.displayName, `${this.remark} 预计获得: ${coin} 金币`);
      return {
        cid: ad.ad.creativeId,
        llsid: ad.exp_tag?.split("/")?.[1]?.split("_")?.[0] || "",
        hasRewardEnd: ad.ad.adDataV2?.onceAgainRewardInfo?.hasMore || false,
        expectedCoins: coin,
        taskConfig: task
      };
    }
    this.adFailCount++;
    if (this.adFailCount >= CONFIG.AD_FAIL_LIMIT) this.stopAll = true;
    return null;
  }
  async genReportSign(cid, llsid, task) {
    try {
      const bizStr = JSON.stringify({
        businessId: task.businessId,
        endTime: Date.now(),
        extParams: "",
        mediaScene: "video",
        neoInfos: [{
          creativeId: cid, extInfo: "", llsid,
          requestSceneType: task.requestSceneType,
          taskType: task.taskType,
          watchExpId: "", watchStage: 0
        }],
        pageId: task.pageId || 100011251,
        posId: task.posId,
        reportType: 0,
        sessionId: "",
        startTime: Date.now() - 30000,
        subPageId: task.subPageId
      });
      const postData = `bizStr=${encodeURIComponent(bizStr)}&cs=false&client_key=${this.platform.reportClientKey}`;
      const qs = this.queryParams + "&" + postData;
      // 传kpnType到签名函数
      const sign = await this.retry(
        () => getNsSign({
          urlpath: "/rest/r/ad/task/report",
          reqdata: qs,
          salt: this.salt
        }, this.proxyUrl, this.platform.displayName, this.remark, this.kpnType),
        "生成报告签名"
      );
      if (!sign) return null;
      return {
        sig: sign.sig, sig3: sign.__NS_sig3,
        xfalcon: sign.__NS_xfalcon, sigtoken: sign.__NStokensig,
        post: postData
      };
    } catch (e) {
      return null;
    }
  }
  async submitReport(cid, llsid, taskKey, task) {
    const sign = await this.genReportSign(cid, llsid, task);
    if (!sign) return { success: false, reward: 0 };
    const url = "https://api.e.kuaishou.com/rest/r/ad/task/report?" +
      `${this.queryParams}&sig=${sign.sig}&__NS_sig3=${sign.sig3}&__NS_xfalcon=${sign.xfalcon}&__NStokensig=${sign.sigtoken}`;
    const { body } = await request({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Host: "api.e.kuaishou.com",
        Cookie: this.cookie,
        "User-Agent": "kwai-android aegon/3.56.0"
      },
      form: querystring.parse(sign.post),
      timeout: 12000
    }, this.proxyUrl, "提交任务报告");
    if (!body) return { success: false, reward: 0 };
    if (body.result === 1) {
      const coin = Number(body.data?.neoAmount) || 0;
      this.taskStats[taskKey].totalReward += coin;
      if (coin === 1) {
        this.continuous1Coin++;
        if (this.continuous1Coin >= CONFIG.CONTINUOUS_1COIN_LIMIT) {
          log(this.proxyUrl, this.platform.displayName, `${this.remark} 连续${CONFIG.CONTINUOUS_1COIN_LIMIT}次1金币，停止任务`);
          this.stopAll = true;
        }
      } else {
        this.continuous1Coin = 0;
      }
      if (coin <= CONFIG.LOW_REWARD_THRESHOLD) {
        this.lowRewardStreak++;
        if (this.lowRewardStreak >= CONFIG.LOW_REWARD_LIMIT) {
          log(this.proxyUrl, this.platform.displayName, `${this.remark} 连续低奖励超限，停止任务`);
          this.stopAll = true;
        }
      } else {
        this.lowRewardStreak = 0;
      }
      return { success: true, reward: coin };
    }
    if ([20107, 20108, 1003, 415].includes(body.result)) {
      return { success: false, reward: 0, limitReached: true };
    }
    return { success: false, reward: 0 };
  }
  async runTask(taskKey) {
    if (this.taskDisabled[taskKey] || this.taskLimit[taskKey] || this.stopAll) return { success: false, reward: 0 };
    let adInfo = null;
    while (!adInfo && !this.stopAll) {
      adInfo = await this.getAdInfo(taskKey);
      if (!adInfo && !this.stopAll) await new Promise(r => setTimeout(r, 3000));
    }
    if (!adInfo) {
      this.taskStats[taskKey].failed++;
      return { success: false, reward: 0 };
    }
    const watchMs = Math.floor(Math.random() * (CONFIG.WATCH_MAX - CONFIG.WATCH_MIN) + CONFIG.WATCH_MIN) * 1000;
    log(this.proxyUrl, this.platform.displayName, `${this.remark} 观看广告中，等待 ${Math.round(watchMs/1000)} 秒...`);
    await new Promise(r => setTimeout(r, watchMs));
    log(this.proxyUrl, this.platform.displayName, `${this.remark} 观看完成，提交任务报告`);
    const result = await this.submitReport(adInfo.cid, adInfo.llsid, taskKey, adInfo.taskConfig);
    if (result.success) {
      this.taskStats[taskKey].success++;
      log(this.proxyUrl, this.platform.displayName, `${this.remark} ✅ 提交成功！获得 ${result.reward} 金币`);
      return { success: true, reward: result.reward, hasRewardEnd: adInfo.hasRewardEnd };
    }
    if (result.limitReached) this.taskLimit[taskKey] = true;
    this.taskStats[taskKey].failed++;
    return { success: false, reward: 0, limitReached: result.limitReached || false };
  }
  nextTask() {
    const available = this.tasksToRun.filter(t => !this.taskLimit[t] && !this.taskDisabled[t]);
    if (available.length === 0 || this.stopAll) return null;
    this.currentTaskIndex = (this.currentTaskIndex + 1) % available.length;
    return available[this.currentTaskIndex];
  }
  async restAfterAd(count) {
    if (count > 0 && count % CONFIG.APPEND_REST_INTERVAL === 0) {
      const ms = Math.floor(Math.random() * (CONFIG.APPEND_REST_MAX - CONFIG.APPEND_REST_MIN)) + CONFIG.APPEND_REST_MIN;
      await new Promise(r => setTimeout(r, ms));
    }
  }
  async run() {
    await this.initIP();
    if (this.stopAll) {
      return { success: false, remark: this.remark, platform: this.platform.name, taskCount: 0, totalReward: 0, exitIP: this.clientIP, stopReason: "初始化失败" };
    }
    const user = await getUserInfo(this.cookie, this.platform, this.proxyUrl);
    if (!user.success || user.ckExpired) {
      log(this.proxyUrl, this.platform.displayName, `${this.remark} Cookie已过期或无效`);
      return { success: false, remark: this.remark, platform: this.platform.name, taskCount: 0, totalReward: 0, exitIP: this.clientIP, stopReason: "Cookie过期" };
    }
    log(this.proxyUrl, this.platform.displayName,
      `${this.remark} 登录成功 | 昵称: ${user.nickname || "未知"} | 金币: ${user.totalCoin} | 余额: ${user.allCash.toFixed(2)}`);
    let totalTasks = 0, appendTasks = 0, stopReason = "正常结束";
    while (!this.stopAll) {
      if (this.isCycleMode && this.currentRound >= this.cycleRounds) {
        stopReason = `已完成${this.cycleRounds}轮任务`;
        break;
      }
      const task = this.nextTask();
      if (!task) { stopReason = "无可用任务"; this.stopAll = true; break; }
      const res = await this.runTask(task);
      totalTasks++;
      if (res.hasRewardEnd) {
        appendTasks++;
        await this.restAfterAd(appendTasks);
        await this.runTask(task);
      }
      if (this.adFailCount >= CONFIG.AD_FAIL_LIMIT) { stopReason = "广告获取失败达上限"; this.stopAll = true; }
      if (this.nextTask() && !this.stopAll) {
        const delay = Math.floor(Math.random() * 5 + 5) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
      if (this.isCycleMode && this.currentTaskIndex === this.tasksToRun.length - 1) this.currentRound++;
    }
    const totalReward = Object.values(this.taskStats).reduce((s, t) => s + t.totalReward, 0);
    log(this.proxyUrl, this.platform.displayName,
      `${this.remark} 结束 | 执行任务: ${totalTasks} | 总获金币: ${totalReward} | 原因: ${stopReason}`);
    for (const [k, s] of Object.entries(this.taskStats)) {
      const cfg = this.taskConfigs[k];
      if (cfg) log(null, this.platform.displayName, `  └ ${cfg.name}: 成功${s.success}次 失败${s.failed}次 奖励${s.totalReward}金币`);
    }
    return { success: true, remark: this.remark, platform: this.platform.name, taskCount: totalTasks, appendCount: appendTasks, totalReward, exitIP: this.clientIP, stopReason };
  }
}

// ==============================================
// 账号解析 & 批量执行（原代码未改动）
// ==============================================
function parseAccountLine(line, index) {
  if (!line || typeof line !== "string") return null;
  const parts = line.split("#");
  if (parts.length < 3) return null;
  const remark = parts[0].trim() || `账号${index}`;
  const cookie = parts[1].trim();
  const salt = parts[2].trim();
  let proxy = parts[3]?.trim() || null;
  if (!cookie || !salt) return null;
  if (proxy && proxy.includes("|")) {
    const [host, port, user, pwd] = proxy.split("|");
    proxy = `socks5://${user}:${pwd}@${host}:${port}`;
  }
  if (proxy && !/^socks5:\/\//i.test(proxy)) {
    console.log(`⚠️ 账号${index} 代理格式非socks5，已忽略: ${proxy}`);
    proxy = null;
  }
  return { cookie, salt, remark, proxyUrl: proxy };
}
function loadAllAccounts() {
  const accounts = [];
  const exists = new Set();
  let index = 1;
  let proxyCount = 0;
  const mainCk = process.env.ksck;
  if (mainCk) {
    mainCk.split("&").forEach(line => {
      line = line.trim();
      if (line && !exists.has(line)) {
        const acc = parseAccountLine(line, index++);
        if (acc) { accounts.push(acc); exists.add(line); if (acc.proxyUrl) proxyCount++; }
      }
    });
  }
  for (let i = 1; i <= 666; i++) {
    const line = process.env[`ksck${i}`]?.trim();
    if (line && !exists.has(line)) {
      const acc = parseAccountLine(line, index++);
      if (acc) { accounts.push(acc); exists.add(line); if (acc.proxyUrl) proxyCount++; }
    }
  }
  print(`\n✅ 共加载账号: ${accounts.length} 个（其中代理账号: ${proxyCount} 个）`);
  return accounts;
}
async function runAccountList(accounts) {
  const results = [];
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    print(`\n${"=".repeat(60)}`);
    print(`🚀 开始执行账号 ${i+1}/${accounts.length}: ${acc.remark}`);
    print(`${"=".repeat(60)}`);
    const instance = new KuaishouAccount({ ...acc, index: i + 1 });
    const result = await instance.run();
    results.push(result);
  }
  return results;
}
function printSummary(results) {
  print(`\n${"=".repeat(60)}`);
  print(" 📊 全部账号执行结果汇总");
  print(`${"=".repeat(60)}`);
  let totalReward = 0;
  results.forEach((r, i) => {
    const tag = r.platform === "JSB" ? "[极速版]" : "[快手  ]";
    print(`${tag} 账号${i+1} ${r.remark} | 任务数:${r.taskCount} | 金币:${r.totalReward} | ${r.stopReason}`);
    totalReward += r.totalReward || 0;
  });
  print(`${"=".repeat(60)}`);
  print(` 🎉 全部完成 | 账号数: ${results.length} | 总金币: ${totalReward}`);
  print(`${"=".repeat(60)}`);
}

// ==============================================
// 启动（原代码未改动）
// ==============================================
print("================================================================================");
print(" ⭐ 快手双端脚本 ⭐ ");
print(" 支持快手 & 快手极速版 · 无需卡密授权 · 按kpn自动切换签名接口 ");
print("================================================================================");
print(`\n🎯 默认任务: ${CONFIG.DEFAULT_TASKS.join(", ")}`);
print(`⏱  观看时长: ${CONFIG.WATCH_MIN}-${CONFIG.WATCH_MAX} 秒`);
print(`🔄 循环轮数: ${CONFIG.CYCLE_ROUNDS > 0 ? CONFIG.CYCLE_ROUNDS : "无限制"}`);
print("\n📋 环境变量说明:");
print("   ksck               = 账号配置，格式: 备注#cookie#salt#socks5代理(可选)");
print("   ksck1~ksck666      = 多账号扩展");
print("   KS_DEFAULT_TASKS   = 任务列表，逗号分隔，可选: box,look,food,search");
print("   KS_CYCLE_ROUNDS    = 循环轮数 (0=无限)");
print("   KS_WATCH_MIN/MAX   = 广告观看秒数范围");
print("   KS_LOW_REWARD_THRESHOLD = 低奖励阈值");
print("   KS_LOW_REWARD_LIMIT     = 连续低奖励停止次数");
print("================================================================================\n");
(async () => {
  const accounts = loadAllAccounts();
  if (accounts.length === 0) {
    print("❌ 未检测到账号配置，请设置 ksck 环境变量");
    print("   格式: 备注#cookie字符串#salt值");
    print("   示例: 我的账号#did=xxx;userId=yyy;...#abcdef1234");
    process.exit(1);
  }
  const results = await runAccountList(accounts);
  printSummary(results);
})();

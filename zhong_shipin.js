//走个码吧，谢谢兄弟们了
//后台注册地址https://zsp.99panel.top/#/register?inviteCode=lzwbaleD
//前台https://a.zsp55.app/
//变量格式：备注#SecretId#SecretKey#deviceld
const ENV_NAME = "中视频";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 15; 23013RK75C Build/AQ3A.250226.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.260 Mobile Safari/537.36 (Immersed/39.42857) Html5Plus/1.0";
const BASE_URL = "https://x1.zsptv.online";

// 工具函数
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP请求函数
async function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const https = url.protocol === 'https:' ? require('https') : require('http');
    
    const req = https.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        // 调试：记录响应
        if (res.statusCode === 403) {
          console.log(`🔍 响应体: ${data.substring(0, 200)}...`);
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Unicode解码函数
function decodeUnicode(str) {
  if (!str) return '';
  return str.replace(/\\u[\dA-F]{4}/gi, 
    match => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)));
}

// 主函数
async function main() {
  console.log(`🔔 脚本开始运行，时间: ${new Date().toLocaleString()}\n`);
  
  // 读取环境变量
  const accounts = loadAccounts();
  
  if (accounts.length === 0) {
    console.log("❌ 未找到有效的账号配置，请检查环境变量格式！");
    return;
  }
  
  console.log(`✅ 找到 ${accounts.length} 个账号\n`);
  
  // 遍历所有账号
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`\n📱 开始处理账号 ${i+1}: ${account.remark}`);
    console.log("=".repeat(30));
    
    try {
      await processAccount(account);
    } catch (error) {
      console.log(`❌ 处理账号 ${account.remark} 时出错: ${error.message}`);
    }
    
    // 账号间延迟
    if (i < accounts.length - 1) {
      console.log("\n⏳ 等待5秒后处理下一个账号...");
      await wait(5000);
    }
  }
  
  console.log(`\n🎉 所有账号处理完成！`);
}

// 加载账号信息
function loadAccounts() {
  const accounts = [];
  
  // 尝试从不同环境变量名称读取
  const envNames = ['ZSP', 'AD_WATCH_ACCOUNTS'];
  let envValue = '';
  
  for (const envName of envNames) {
    if (process.env[envName]) {
      envValue = process.env[envName];
      console.log(`📋 从环境变量 ${envName} 读取配置`);
      break;
    }
  }
  
  if (!envValue) {
    console.log("⚠️ 请设置环境变量 ZSP 或 AD_WATCH_ACCOUNTS");
    return accounts;
  }
  
  const accountStrs = envValue.split("\n").filter(str => str.trim());
  
  for (const str of accountStrs) {
    const parts = str.split("#");
    if (parts.length >= 4) {
      accounts.push({
        remark: parts[0] || "未命名账号",
        secretId: parts[1],
        secretKey: parts[2],
        deviceId: parts[3]
      });
      console.log(`✅ 加载账号: ${parts[0] || "未命名账号"}`);
    } else {
      console.log(`⚠️ 忽略格式错误的环境变量: ${str}`);
    }
  }
  
  return accounts;
}

// 处理单个账号
async function processAccount(account) {
  // 1. 登录获取token
  const token = await login(account);
  if (!token) {
    console.log("❌ 登录失败，跳过此账号");
    return;
  }
  console.log(`✅ 登录成功，token获取完成`);
  
  // 2. 检测并执行签到
  const signed = await checkAndSign(token, account);
  if (!signed) {
    console.log("❌ 签到失败，跳过广告任务");
    return;
  }
  
  console.log(`\n📺 开始执行广告观看任务`);
  console.log("-".repeat(30));
  
  let successCount = 0;
  let failCount = 0;
  let totalReward = 0;
  let consecutiveErrors = 0;
  const maxAds = 50; // 最多执行50次广告任务
  
  for (let adCount = 0; adCount < maxAds; adCount++) {
    console.log(`\n🔄 第 ${adCount + 1}/${maxAds} 次广告任务`);
    
    // 如果连续出现3次错误，重新登录获取新token
    if (consecutiveErrors >= 3) {
      console.log("⚠️ 连续3次错误，尝试重新登录...");
      const newToken = await login(account);
      if (newToken) {
        token = newToken;
        console.log("✅ 重新登录成功，继续任务");
        consecutiveErrors = 0;
      } else {
        console.log("❌ 重新登录失败，跳过此账号");
        break;
      }
    }
    
    try {
      // 获取广告信息
      const adInfo = await getNextAd(token, account);
      if (!adInfo) {
        console.log(`   ⚠️ 获取广告失败`);
        failCount++;
        consecutiveErrors++;
        await wait(3000);
        continue;
      }
      
      console.log(`   📱 广告标题: ${adInfo.title}`);
      console.log(`   ⏱️  需要观看: ${adInfo.duration}秒`);
      console.log(`   🪙 预期奖励: ${adInfo.reward || 0}`);
      
      // 开始播放广告
      console.log(`   ▶️  开始播放广告...`);
      const playResult = await claimReward(token, account, adInfo.id, adInfo.duration);
      
      if (playResult && playResult.success) {
        console.log(`   ✅ 广告观看成功!`);
        console.log(`   💰 获得奖励: ${playResult.reward || 0}`);
        
        successCount++;
        totalReward += parseInt(playResult.reward) || 0;
        consecutiveErrors = 0; // 重置错误计数
        
        // 任务间延迟 (避免请求过快)
        if (adCount < maxAds - 1) {
          const randomDelay = Math.floor(Math.random() * 3000) + 3000; // 3-6秒随机延迟
          console.log(`   ⏳ 等待${Math.round(randomDelay/1000)}秒后处理下一个广告...`);
          await wait(randomDelay);
        }
      } else {
        console.log(`   ❌ 广告观看失败`);
        failCount++;
        consecutiveErrors++;
        await wait(3000);
      }
      
    } catch (error) {
      console.log(`   ❌ 广告任务出错: ${error.message}`);
      failCount++;
      consecutiveErrors++;
      await wait(3000);
    }
  }
  
  console.log("\n" + "=".repeat(30));
  console.log(`📊 任务完成统计:`);
  console.log(`   ✅ 成功: ${successCount} 次`);
  console.log(`   ❌ 失败: ${failCount} 次`);
  console.log(`   💰 总计奖励: ${totalReward}`);
  console.log(`   📈 成功率: ${((successCount/maxAds)*100).toFixed(1)}%`);
}

// 登录接口
async function login(account) {
  const url = `${BASE_URL}/api/app/v1/auth/secretKeyLogin`;
  
  const body = {
    secretId: account.secretId,
    secretKey: account.secretKey
  };
  
  const headers = {
    "Accept": "*/*",
    "User-Agent": USER_AGENT,
    "app-device": JSON.stringify({
      "id": account.deviceId,
      "brand": "xiaomi",
      "model": "23013RK75C",
      "platform": "android",
      "system": "Android 15"
    }),
    "Content-Type": "application/json",
    "Host": "x1.zsptv.online"
  };
  
  try {
    const response = await httpRequest({
      url: url,
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    
    if (response.statusCode !== 200) {
      console.log(`❌ 登录请求失败，状态码: ${response.statusCode}`);
      return null;
    }
    
    const data = JSON.parse(response.body);
    
    if (data.code === 0 && data.data && data.data.token) {
      return data.data.token;
    } else {
      console.log(`❌ 登录失败: ${data.message || "未知错误"}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ 登录请求失败: ${error.message}`);
    return null;
  }
}

// 检测并执行签到
async function checkAndSign(token, account) {
  const url = `${BASE_URL}/api/app/v1/device/userSign`;
  
  const headers = {
    "Accept": "*/*",
    "User-Agent": USER_AGENT,
    "Authorization": `Bearer ${token}`,
    "app-device": JSON.stringify({
      "id": account.deviceId,
      "brand": "xiaomi",
      "model": "23013RK75C",
      "platform": "android",
      "system": "Android 15"
    }),
    "Content-Type": "application/json",
    "Host": "x1.zsptv.online"
  };
  
  try {
    const response = await httpRequest({
      url: url,
      method: "POST",
      headers: headers,
      body: "{}"
    });
    
    if (response.statusCode !== 200) {
      console.log(`❌ 签到请求失败，状态码: ${response.statusCode}`);
      return false;
    }
    
    const data = JSON.parse(response.body);
    
    if (data.code === 0) {
      const message = decodeUnicode(data.message);
      console.log(`✅ 签到结果: ${message}`);
      
      if (data.data) {
        console.log(`   🪙 获得签到金币: ${data.data.qiandao_money || 0}`);
        console.log(`   📅 连续签到天数: ${data.data.continuousDays || 1}`);
      }
      
      return true;
    } else {
      const errorMsg = decodeUnicode(data.message || "未知错误");
      console.log(`❌ 签到失败: ${errorMsg}`);
      
      // 如果已签到，也返回true，继续执行广告任务
      if (errorMsg && errorMsg.includes("已签到")) {
        console.log(`ℹ️  今日已签到，继续执行广告任务`);
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.log(`❌ 签到请求失败: ${error.message}`);
    return false;
  }
}

// 获取下一个广告
async function getNextAd(token, account) {
  const url = `${BASE_URL}/api/app/v1/ad/next`;
  
  const headers = {
    "Accept": "*/*",
    "User-Agent": USER_AGENT,
    "Authorization": `Bearer ${token}`,
    "app-device": JSON.stringify({
      "id": account.deviceId,
      "brand": "xiaomi",
      "model": "23013RK75C",
      "platform": "android",
      "system": "Android 15"
    }),
    "Content-Type": "application/json",
    "Host": "x1.zsptv.online"
  };
  
  try {
    const response = await httpRequest({
      url: url,
      method: "GET",
      headers: headers
    });
    
    if (response.statusCode !== 200) {
      console.log(`   ❌ 获取广告失败，状态码: ${response.statusCode}`);
      if (response.body) {
        const errorData = JSON.parse(response.body);
        console.log(`   🔍 错误信息: ${errorData.message || "未知错误"}`);
      }
      return null;
    }
    
    const data = JSON.parse(response.body);
    
    if (data.code === 0 && data.data && data.data.result) {
      const ad = data.data.result;
      return {
        id: ad.id,
        title: decodeUnicode(ad.title),
        description: decodeUnicode(ad.description),
        duration: parseInt(ad.video?.duration || 30), // 默认30秒
        videoUrl: ad.video?.url || "",
        playUrl: ad.video?.play_url || "",
        reward: ad.reward
      };
    } else {
      const errorMsg = decodeUnicode(data.message || "未知错误");
      console.log(`   ❌ 获取广告失败: ${errorMsg}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ 获取广告请求失败: ${error.message}`);
    return null;
  }
}

// 观看广告并获取奖励（整合播放和结束确认）
async function claimReward(token, account, adId, duration) {
  const startTime = new Date().toISOString();
  
  // 1. 开始播放广告
  console.log(`   📅 播放开始时间: ${startTime}`);
  const playResult = await startVideoPlay(token, account, adId, startTime);
  
  if (!playResult || !playResult.playRecordId) {
    console.log(`   ❌ 广告播放开始失败`);
    return { success: false };
  }
  
  console.log(`   ✅ 播放开始成功! 记录ID: ${playResult.playRecordId}`);
  console.log(`   💰 初始奖励: ${playResult.initialReward || 0}`);
  
  // 2. 等待广告播放时间
  const waitTime = duration * 1000;
  console.log(`   ⌛ 广告播放中，等待 ${duration} 秒...`);
  await wait(waitTime);
  
  // 3. 广告播放结束确认
  console.log(`   ⏹️  广告播放完成，确认结束...`);
  const endResult = await endVideoPlay(token, account, playResult.playRecordId);
  
  if (endResult.success) {
    console.log(`   🎉 广告观看完整流程完成!`);
    return {
      success: true,
      reward: playResult.reward || 0,
      playRecordId: playResult.playRecordId
    };
  } else {
    console.log(`   ⚠️ 广告观看完成，但结束确认失败`);
    // 即使结束确认失败，也视为成功（因为已经播放完成）
    return {
      success: true,
      reward: playResult.reward || 0,
      playRecordId: playResult.playRecordId
    };
  }
}

// 开始播放广告
async function startVideoPlay(token, account, adId, playTime) {
  const url = `${BASE_URL}/api/app/v1/ad/video/play`;
  
  const body = {
    clientIp: "",
    deviceInfo: {
      deviceId: account.deviceId,
      platform: "android"
    },
    id: adId.toString(),
    playTime: playTime
  };
  
  const headers = {
    "Accept": "*/*",
    "User-Agent": USER_AGENT,
    "Authorization": `Bearer ${token}`,
    "app-device": JSON.stringify({
      "id": account.deviceId,
      "brand": "xiaomi",
      "model": "23013RK75C",
      "platform": "android",
      "system": "Android 15"
    }),
    "Content-Type": "application/json",
    "Host": "x1.zsptv.online"
  };
  
  try {
    const response = await httpRequest({
      url: url,
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    
    if (response.statusCode !== 200) {
      console.log(`   ❌ 开始播放广告失败，状态码: ${response.statusCode}`);
      return null;
    }
    
    const data = JSON.parse(response.body);
    
    if (data.code === 0 && data.data) {
      return {
        playRecordId: data.data.id,
        initialReward: data.data.reward || 0,
        reward: data.data.reward || 0
      };
    } else {
      console.log(`   ❌ 开始播放广告失败: ${data.message || "未知错误"}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ 开始播放广告请求失败: ${error.message}`);
    return null;
  }
}

// 结束广告播放
async function endVideoPlay(token, account, playRecordId) {
  const url = `${BASE_URL}/api/app/v1/ad/video/ended`;
  const endTime = new Date().toISOString();
  
  const body = {
    clientIp: "",
    deviceInfo: {
      deviceId: account.deviceId,
      platform: "android"
    },
    id: playRecordId.toString(),
    playTime: endTime
  };
  
  const headers = {
    "Accept": "*/*",
    "User-Agent": USER_AGENT,
    "Authorization": `Bearer ${token}`,
    "app-device": JSON.stringify({
      "id": account.deviceId,
      "brand": "xiaomi",
      "model": "23013RK75C",
      "platform": "android",
      "system": "Android 15"
    }),
    "Content-Type": "application/json",
    "Host": "x1.zsptv.online"
  };
  
  try {
    const response = await httpRequest({
      url: url,
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    
    if (response.statusCode !== 200) {
      console.log(`   ⚠️ 广告结束确认失败，状态码: ${response.statusCode}`);
      // 即使结束确认失败，也返回成功（避免403错误导致任务中断）
      return { success: true };
    }
    
    const data = JSON.parse(response.body);
    
    if (data.code === 0) {
      return { success: true };
    } else {
      console.log(`   ⚠️ 广告结束确认返回异常: ${data.message || "未知错误"}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`   ⚠️ 广告结束确认请求失败: ${error.message}`);
    return { success: false };
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(console.error);
}

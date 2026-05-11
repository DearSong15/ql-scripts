
// 接口配置
const SIGN_API_URL = "http://127.0.0.1:8889";
const encryptTag = "jsjiami.com.v7";
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const querystring = require("querystring");
const { SocksProxyAgent } = require("socks-proxy-agent");

// 依赖自动安装
function checkAndInstall(pkg, versionSuffix = "") {
  try {
    require.resolve(pkg);
    console.log("[依赖检查] " + pkg + " 已安装.");
  } catch (err) {
    console.log("[依赖检查] " + pkg + " 缺失，正在自动安装" + (versionSuffix ? " (" + versionSuffix + ")" : "") + "...");
    try {
      childProcess.execSync("npm install " + pkg + versionSuffix, { stdio: "inherit" });
      console.log("[依赖修补] " + pkg + " 安装成功，继续运行.");
    } catch (installErr) {
      console.error("[依赖修补失败] 无法安装 " + pkg + ": " + installErr.message);
      process.exit(1);
    }
  }
}

// Node 版本检测
const nodeVersion = process.versions.node;
const [majorVer, minorVer] = nodeVersion.split(".").map(Number);
console.log("[Node.js 版本检测] 当前版本: " + nodeVersion + " (major: " + majorVer + ", minor: " + minorVer + ")");

let requestVer = "";
let socksAgentVer = "";

if (majorVer >= 18) {
  console.log("[Node.js 版本兼容] Node.js 18+ 检测到，使用 request 默认版本（若有警告，可忽略或升级脚本）");
  process.noDeprecation = true;
} else if (majorVer < 14) {
  socksAgentVer = "@^5.0.0";
  console.log("[Node.js 版本兼容] Node.js < 14 检测到，使用 socks-proxy-agent 旧版以兼容.");
} else {
  console.log("[Node.js 版本兼容] Node.js 14-17 检测到，使用默认依赖版本.");
}

checkAndInstall("request", requestVer);
checkAndInstall("socks-proxy-agent", socksAgentVer);

const request = require("request");
process.noDeprecation = true;


// ==================== 养号配置 ====================
const FARM_CONFIG = {
    ENABLE_FARM: process.env.ENABLE_FARM === "1" || process.env.ENABLE_FARM === "true" || true,
    LOW_REWARD_FARM_THRESHOLD: parseInt(process.env.LOW_REWARD_FARM_THRESHOLD) || 200,
    // 刷视频配置：每个视频60-90秒，总时长15-20分钟
    SINGLE_VIDEO_WATCH_MIN: parseInt(process.env.SINGLE_VIDEO_WATCH_MIN) || 60,
    SINGLE_VIDEO_WATCH_MAX: parseInt(process.env.SINGLE_VIDEO_WATCH_MAX) || 90,
    FARM_VIDEO_TIME_MIN: parseInt(process.env.FARM_VIDEO_TIME_MIN) || 15,
    FARM_VIDEO_TIME_MAX: parseInt(process.env.FARM_VIDEO_TIME_MAX) || 20,
    // 小说阅读配置：看几章（3-8章）
    NOVEL_CHAPTERS_MIN: parseInt(process.env.NOVEL_CHAPTERS_MIN) || 3,
    NOVEL_CHAPTERS_MAX: parseInt(process.env.NOVEL_CHAPTERS_MAX) || 8,
    // 直播配置：20-30分钟
    LIVE_WATCH_TIME_MIN: parseInt(process.env.LIVE_WATCH_TIME_MIN) || 20,
    LIVE_WATCH_TIME_MAX: parseInt(process.env.LIVE_WATCH_TIME_MAX) || 30,
    // 小游戏试玩：15-25分钟
    MINI_GAME_PLAY_MIN: parseInt(process.env.MINI_GAME_PLAY_MIN) || 15,
    MINI_GAME_PLAY_MAX: parseInt(process.env.MINI_GAME_PLAY_MAX) || 25,
    // 商城浏览：3-6个商品，每个60-90秒
    SHOP_BROWSE_ITEMS_MIN: parseInt(process.env.SHOP_BROWSE_ITEMS_MIN) || 3,
    SHOP_BROWSE_ITEMS_MAX: parseInt(process.env.SHOP_BROWSE_ITEMS_MAX) || 6,
    SHOP_ITEM_BROWSE_MIN: parseInt(process.env.SHOP_ITEM_BROWSE_MIN) || 60,
    SHOP_ITEM_BROWSE_MAX: parseInt(process.env.SHOP_ITEM_BROWSE_MAX) || 90,
    // 互动概率
    FARM_LIKE_RATE: parseInt(process.env.FARM_LIKE_RATE) || 40,
    FARM_COLLECT_RATE: parseInt(process.env.FARM_COLLECT_RATE) || 15,
    FARM_COMMENT_RATE: parseInt(process.env.FARM_COMMENT_RATE) || 10,
    FARM_DAILY_LIMIT: parseInt(process.env.FARM_DAILY_LIMIT) || 3
};

// 搜索关键词
const SEARCH_KEYWORDS = ["捕鱼游戏", "传奇", "游戏推荐"];

// 商城搜索关键词
const SHOP_SEARCH_KEYWORDS = ["黑丝", "学习机", "投资金条", "冲锋衣", "按摩枕"];

// 评论库
const COMMENT_LIST = [
    "真的非常的好，很喜欢这个作品",
    "确实是这样的",
    "喜欢，多发，爱看",
    "可以的，有点猛的",
    "爱了，爱了，多发一点就爱看这种",
    "孔子没看懂，老子也没看懂这是干啥的",
    "太有意思了，笑死我了",
    "学到了，感谢分享",
    "这个必须支持一下",
    "说的太对了，深有感触"
];

// 直播评论库
const LIVE_COMMENT_LIST = [
    "主播讲得真好",
    "支持主播",
    "666",
    "太精彩了",
    "学到了学到了",
    "点赞支持",
    "来了来了",
    "不错不错",
    "主播加油",
    "这个直播太有意思了"
];

// ==================== 养号功能函数 ====================
function randomDelay(minMs, maxMs) {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomComment() {
    return COMMENT_LIST[Math.floor(Math.random() * COMMENT_LIST.length)];
}

function getRandomLiveComment() {
    return LIVE_COMMENT_LIST[Math.floor(Math.random() * LIVE_COMMENT_LIST.length)];
}

// 模拟浏览小说（看几章）
async function simulateNovelReading(accountName) {
    const chaptersCount = Math.floor(Math.random() * (FARM_CONFIG.NOVEL_CHAPTERS_MAX - FARM_CONFIG.NOVEL_CHAPTERS_MIN + 1)) + FARM_CONFIG.NOVEL_CHAPTERS_MIN;
    console.log(`📖 [${accountName}] 进入小说广告页面，开始阅读 ${chaptersCount} 章...`);

    for (let i = 1; i <= chaptersCount; i++) {
        const readTime = Math.floor(Math.random() * 60000) + 30000; // 30-90秒每章
        console.log(`📖 [${accountName}] 阅读第 ${i}/${chaptersCount} 章，约 ${Math.round(readTime/1000)} 秒`);
        await randomDelay(readTime, readTime + 10000);
    }

    console.log(`📖 [${accountName}] 小说阅读完成，共 ${chaptersCount} 章`);
    await randomDelay(2000, 5000);
}

// 模拟下载安装试玩App（通用）
async function simulateAppPlay(accountName, appName = "游戏") {
    const playTime = Math.floor(Math.random() * (FARM_CONFIG.MINI_GAME_PLAY_MAX - FARM_CONFIG.MINI_GAME_PLAY_MIN) * 60000) + FARM_CONFIG.MINI_GAME_PLAY_MIN * 60000;
    const playMinutes = Math.round(playTime / 60000);

    console.log(`📱 [${accountName}] 进入${appName}广告页面，开始下载...`);
    await randomDelay(5000, 15000);
    console.log(`📱 [${accountName}] 下载完成，开始安装...`);
    await randomDelay(3000, 8000);
    console.log(`📱 [${accountName}] 安装完成，开始试玩 ${playMinutes} 分钟...`);

    const gameStages = ["新手引导", "完成第一关", "查看奖励", "继续游戏", "完成每日任务"];
    const stageCount = Math.min(gameStages.length, Math.ceil(playTime / 60000));
    for (let i = 0; i < stageCount; i++) {
        await randomDelay(30000, 90000);
        console.log(`📱 [${accountName}] ${appName}进度: ${gameStages[i % gameStages.length]}`);
    }

    console.log(`📱 [${accountName}] 试玩完成，共 ${playMinutes} 分钟`);
    await randomDelay(2000, 5000);
}

// 模拟观看直播并互动（20-30分钟）
async function simulateLiveWatch(accountName, hasMiniGame = false) {
    const watchTime = Math.floor(Math.random() * (FARM_CONFIG.LIVE_WATCH_TIME_MAX - FARM_CONFIG.LIVE_WATCH_TIME_MIN) * 60000) + FARM_CONFIG.LIVE_WATCH_TIME_MIN * 60000;
    const watchMinutes = Math.round(watchTime / 60000);

    console.log(`🎥 [${accountName}] 进入直播间，开始观看 ${watchMinutes} 分钟...`);

    let likeCount = 0;
    let commentCount = 0;
    let giftCount = 0;
    const startTime = Date.now();

    // 如果直播间有小游戏，先试玩
    if (hasMiniGame) {
        console.log(`🎮 [${accountName}] 直播间发现挂载小游戏，开始试玩...`);
        await simulateAppPlay(accountName, "直播间小游戏");
    }

    while (Date.now() - startTime < watchTime) {
        await randomDelay(15000, 45000);

        // 随机点赞
        if (Math.random() * 100 < 50) {
            likeCount++;
            console.log(`❤️ [${accountName}] 点赞直播 (${likeCount}次)`);
        }

        // 随机评论
        if (Math.random() * 100 < 25) {
            commentCount++;
            const comment = getRandomLiveComment();
            console.log(`💬 [${accountName}] 直播评论: "${comment}"`);
            await randomDelay(2000, 5000);
        }

        // 随机送小礼物（10%概率）
        if (Math.random() * 100 < 10) {
            giftCount++;
            console.log(`🎁 [${accountName}] 赠送小礼物 (${giftCount}次)`);
            await randomDelay(1000, 3000);
        }

        const elapsed = Math.round((Date.now() - startTime) / 60000);
        console.log(`🎥 [${accountName}] 观看直播中... ${elapsed}/${watchMinutes}分钟`);
    }

    console.log(`🎥 [${accountName}] 直播观看完成，共 ${watchMinutes} 分钟，点赞${likeCount}次，评论${commentCount}次，送礼${giftCount}次`);
}

// 模拟商城商品浏览
async function simulateShopBrowsing(accountName) {
    const itemsCount = Math.floor(Math.random() * (FARM_CONFIG.SHOP_BROWSE_ITEMS_MAX - FARM_CONFIG.SHOP_BROWSE_ITEMS_MIN + 1)) + FARM_CONFIG.SHOP_BROWSE_ITEMS_MIN;
    const searchKeyword = SHOP_SEARCH_KEYWORDS[Math.floor(Math.random() * SHOP_SEARCH_KEYWORDS.length)];

    console.log(`🛒 [${accountName}] 进入商城，搜索: "${searchKeyword}"`);
    await randomDelay(2000, 5000);

    const addedToCart = Math.floor(Math.random() * itemsCount); // 随机选择一个商品加入购物车
    const browseResults = [];

    for (let i = 0; i < itemsCount; i++) {
        const browseTime = Math.floor(Math.random() * (FARM_CONFIG.SHOP_ITEM_BROWSE_MAX - FARM_CONFIG.SHOP_ITEM_BROWSE_MIN) * 1000) + FARM_CONFIG.SHOP_ITEM_BROWSE_MIN * 1000;
        const productId = i + 1;

        console.log(`🛒 [${accountName}] 浏览商品 ${productId}/${itemsCount}，${Math.round(browseTime/1000)}秒`);

        // 模拟浏览商品图片
        await randomDelay(2000, 5000);
        console.log(`   📷 查看商品图片...`);

        // 模拟查看商品参数
        await randomDelay(3000, 8000);
        console.log(`   📋 查看商品参数详情...`);

        // 模拟查看评论区
        await randomDelay(5000, 12000);
        const commentCount = Math.floor(Math.random() * 10) + 1;
        console.log(`   💬 浏览评论区，查看了 ${commentCount} 条评论和图片`);

        // 总浏览时间
        await randomDelay(browseTime - 10000, browseTime);

        browseResults.push({ id: productId, name: `${searchKeyword}商品${productId}` });

        // 随机将商品加入购物车
        if (i === addedToCart) {
            console.log(`🛒 [${accountName}] 将商品 ${productId} 加入购物车！`);
            await randomDelay(1000, 3000);
        }

        if (i < itemsCount - 1) {
            await randomDelay(2000, 5000);
        }
    }

    console.log(`🛒 [${accountName}] 商城浏览完成！浏览了 ${itemsCount} 个商品，1个商品已加入购物车`);
}

// 模拟首页搜索和刷视频
async function farmBrowseVideos(accountName) {
    const farmTime = Math.floor(Math.random() * (FARM_CONFIG.FARM_VIDEO_TIME_MAX - FARM_CONFIG.FARM_VIDEO_TIME_MIN) * 60000) + FARM_CONFIG.FARM_VIDEO_TIME_MIN * 60000;
    const farmMinutes = Math.round(farmTime / 60000);
    console.log(`🌾 [${accountName}] 开始养号刷视频 ${farmMinutes}分钟...`);

    const startTime = Date.now();
    let videoCount = 0;
    let likeCount = 0;
    let collectCount = 0;
    let commentCount = 0;
    let adEncounterCount = 0;
    let searchCount = 0;
    let hasSearched = false;

    while (Date.now() - startTime < farmTime) {
        // 随机进行搜索（每2-3个视频搜索一次）
        if (!hasSearched && (videoCount > 0 && videoCount % 2 === 0) && Math.random() < 0.5) {
            searchCount++;
            const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
            console.log(`🔍 [${accountName}] 搜索关键词: "${keyword}"`);
            await randomDelay(3000, 8000);
            hasSearched = true;

            // 搜索后刷几个相关视频
            const searchVideos = Math.floor(Math.random() * 3) + 2;
            for (let sv = 0; sv < searchVideos; sv++) {
                if (Date.now() - startTime >= farmTime) break;
                videoCount++;
                const watchTime = Math.floor(Math.random() * (FARM_CONFIG.SINGLE_VIDEO_WATCH_MAX - FARM_CONFIG.SINGLE_VIDEO_WATCH_MIN) * 1000) + FARM_CONFIG.SINGLE_VIDEO_WATCH_MIN * 1000;
                console.log(`📺 [${accountName}] 观看搜索相关视频 #${videoCount}，${Math.round(watchTime/1000)}秒`);
                await randomDelay(watchTime, watchTime + 5000);

                // 互动
                if (Math.random() * 100 < FARM_CONFIG.FARM_LIKE_RATE) {
                    likeCount++;
                    console.log(`❤️ [${accountName}] 点赞视频 (#${videoCount})`);
                    await randomDelay(1000, 3000);
                }
            }
            hasSearched = false;
            continue;
        }

        videoCount++;
        const watchTime = Math.floor(Math.random() * (FARM_CONFIG.SINGLE_VIDEO_WATCH_MAX - FARM_CONFIG.SINGLE_VIDEO_WATCH_MIN) * 1000) + FARM_CONFIG.SINGLE_VIDEO_WATCH_MIN * 1000;
        console.log(`📺 [${accountName}] 观看第 ${videoCount} 个视频，${Math.round(watchTime/1000)}秒`);
        await randomDelay(watchTime, watchTime + 3000);

        // 随机遇到广告（30%概率），遇到小说就看几章
        if (Math.random() < 0.3) {
            adEncounterCount++;
            // 随机决定广告类型：小说、游戏、直播
            const adTypes = ["novel", "app", "live"];
            const randomAdType = adTypes[Math.floor(Math.random() * adTypes.length)];
            let adTitle = "";

            if (randomAdType === "novel") {
                adTitle = "小说推荐_精彩阅读";
                console.log(`📢 [${accountName}] 刷视频时遇到小说广告: ${adTitle}`);
                await simulateNovelReading(accountName);
            } else if (randomAdType === "app") {
                adTitle = "游戏推荐_下载试玩";
                console.log(`📢 [${accountName}] 刷视频时遇到游戏广告: ${adTitle}`);
                await simulateAppPlay(accountName, "推荐游戏");
            } else {
                adTitle = "直播推荐";
                console.log(`📢 [${accountName}] 刷视频时遇到直播广告: ${adTitle}`);
                // 直播广告模拟观看5-10分钟
                const shortWatchTime = Math.floor(Math.random() * 300000) + 300000;
                await randomDelay(shortWatchTime, shortWatchTime + 60000);
                console.log(`🎥 [${accountName}] 观看直播广告 ${Math.round(shortWatchTime/60000)}分钟`);
            }
        }

        // 随机点赞
        if (Math.random() * 100 < FARM_CONFIG.FARM_LIKE_RATE) {
            likeCount++;
            console.log(`❤️ [${accountName}] 点赞视频 (#${videoCount})`);
            await randomDelay(1000, 3000);
        }

        // 随机收藏
        if (Math.random() * 100 < FARM_CONFIG.FARM_COLLECT_RATE) {
            collectCount++;
            console.log(`⭐ [${accountName}] 收藏视频 (#${videoCount})`);
            await randomDelay(1000, 3000);
        }

        // 随机评论
        if (Math.random() * 100 < FARM_CONFIG.FARM_COMMENT_RATE) {
            commentCount++;
            const comment = getRandomComment();
            console.log(`💬 [${accountName}] 评论: "${comment}"`);
            await randomDelay(2000, 5000);
        }

        // 滑动切换视频
        await randomDelay(500, 1500);
    }

    console.log(`🌾 [${accountName}] 刷视频养号完成！`);
    console.log(`   观看视频: ${videoCount}个 | 搜索: ${searchCount}次 | 点赞: ${likeCount}次 | 收藏: ${collectCount}次 | 评论: ${commentCount}次 | 广告转化: ${adEncounterCount}次`);
}

// 执行直播间养号（随机进入直播间待20-30分钟）
async function farmLiveWatch(accountName) {
    console.log(`🎥 [${accountName}] 随机进入直播间...`);
    await randomDelay(2000, 5000);

    // 随机决定直播间是否有小游戏（30%概率）
    const hasMiniGame = Math.random() < 0.3;
    await simulateLiveWatch(accountName, hasMiniGame);
}

// 执行商城养号
async function farmShopBrowsing(accountName) {
    await simulateShopBrowsing(accountName);
}

// 完整养号流程
async function doFarming(accountName, triggerReason) {
    console.log(`\n🌾 ========== 开始养号 [${accountName}] ==========`);
    console.log(`🌾 触发原因: ${triggerReason}`);

    // 1. 刷视频养号（15-20分钟）
    await farmBrowseVideos(accountName);

    // 2. 随机进入直播间（20-30分钟），50%概率执行
    if (Math.random() < 0.5) {
        await farmLiveWatch(accountName);
    }

    // 3. 商城浏览（3-6个商品），50%概率执行
    if (Math.random() < 0.5) {
        await farmShopBrowsing(accountName);
    }

    console.log(`🌾 ========== 养号完成 [${accountName}] ==========\n`);
}

// 随机状态文案
function randomAdStatus() {
  const list = ["正在观看广告", "认真观看中...", "浏览广告内容", "模拟用户行为", "观看视频广告", "保持活跃状态", "广告浏览中", "正常观看时长"];
  return list[Math.floor(Math.random() * list.length)];
}

// 环境开关
const DEV_MODE = process.env.DEV_MODE === "1" || process.env.DEV_MODE === "true";
const ENABLE_DID_CHANGE = process.env.ENABLE_DID_CHANGE === "1" || process.env.ENABLE_DID_CHANGE === "true";

// 读取数字环境变量
function getEnvInt(key, defaultValue) {
  const val = parseInt(process.env[key], 10);
  return isNaN(val) ? defaultValue : val;
}

const LOW_REWARD_THRESHOLD = getEnvInt("KSLOW_REWARD_THRESHOLD", 10);
const TOTAL_ROUNDS = getEnvInt("KSROUNDS", 100);
const COIN_LIMIT = getEnvInt("KSCOIN_LIMIT", 100000);
const LOW_REWARD_MAX_TIMES = getEnvInt("KSLOW_REWARD_LIMIT", 3);

// 解析任务列表
function parseTaskList() {
  const taskEnv = process.env.Task;
  if (!taskEnv) {
    console.log("未设置Task环境变量，将执行所有任务 (look, looks, looks, looks, looks)");
    return ["look", "looks", "looks", "looks", "looks"];
  }
  const inputTasks = taskEnv.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
  const validTasks = ["food", "box", "look", "looks"];
  const finalTasks = inputTasks.filter(t => validTasks.includes(t));
  if (finalTasks.length === 0) {
    console.log("Task环境变量中没有有效任务，将执行所有任务 (food, box, look, looks)");
    return validTasks;
  }
  console.log("从Task环境变量中解析到要执行的任务: " + finalTasks.join(", "));
  return finalTasks;
}

// 解析所有账号配置 ksptck / ksptck1~666
function parseAllAccounts() {
  const all = [];
  const uniqueSet = new Set();

  if (process.env.ksptck) {
    const parts = process.env.ksptck.split("&").map(p => p.trim()).filter(Boolean);
    all.push(...parts);
  }

  for (let i = 1; i <= 666; i++) {
    const key = "ksptck" + i;
    if (process.env[key]) {
      const parts = process.env[key].split("&").map(p => p.trim()).filter(Boolean);
      all.push(...parts);
    }
  }

  const uniqueList = [];
  for (const item of all) {
    if (!uniqueSet.has(item)) {
      uniqueSet.add(item);
      uniqueList.push(item);
    }
  }

  console.log("从ksptck及ksptck1到ksptck666环境变量中解析到 " + uniqueList.length + " 个唯一配置");
  return uniqueList;
}

// 全局任务名称映射
const TASK_NAME_MAP = {
  food: "food（看广告得金币1）",
  box: "box（宝箱广告）",
  look: "look（看广告得金币）",
  looks: "looks（看广告得金币追加）"
};

// 并发控制
const DEFAULT_CONCURRENCY = 10;
const MAX_CONCURRENCY_ALLOW = 200;
const userConcurrency = getEnvInt("MAX_CONCURRENCY", NaN);
const CONCURRENCY = isNaN(userConcurrency)
  ? DEFAULT_CONCURRENCY
  : Math.min(Math.max(userConcurrency, 1), MAX_CONCURRENCY_ALLOW);

console.log("================================================================================");
console.log(" ⭐ 快手至尊金币版（广告转化+养号版）⭐ ");
console.log("🏆 安全稳定 · 高效收益 · 尊贵体验 🏆                        ");
console.log("🏆 代理购买2.1r一月· http://www.gzsk5.com/#/register?invitation=hnking2&shareid=516                  ");
console.log("🏆 接口工具脚本获取ck获取· https://pan.quark.cn/s/41d4dae92896                  ");
console.log("🏆 云手机· https://cloud.ace-bot.cn/#/inviteReg?invite=501891                  ");
console.log("================================================================================");
console.log("🎯 新增功能:");
console.log("   - 广告自动转化（小说阅读/APP试玩/直播互动）");
console.log("   - 低奖励自动养号（<200金币触发）");
console.log("   - 刷视频随机点赞/收藏/评论（每个视频60-90秒，总15-20分钟）");
console.log("   - 首页搜索捕鱼游戏/传奇/游戏推荐");
console.log("   - 直播间互动（20-30分钟，随机小游戏试玩）");
console.log("   - 商城浏览（黑丝/学习机/投资金条/冲锋衣/按摩枕，3-6个商品）");
console.log("================================================================================");
console.log("🎉 系统初始化完成，快手至尊金币版（广告转化+养号版）启动成功！🎉");

const accountStrings = parseAllAccounts();
const ACCOUNT_COUNT = accountStrings.length;
const TASKS_TO_RUN = parseTaskList();

console.log("💎 检测到环境变量配置：" + ACCOUNT_COUNT + "个账号");
console.log("🎯 将执行以下任务：" + TASKS_TO_RUN.map(t => TASK_NAME_MAP[t] || t).join(", "));
console.log("🎯 配置参数：");
console.log("   - 任务配置变量=Task (可选: food看广告得金币1, box宝箱广告, look看广告得金币, looks看广告得金币追加, 多个用逗号分隔)");
console.log("   - 账号配置变量=ksptck, 卡密变量=ptkm");
console.log("   - KS_SIGN_API_URL: 签名服务 API 地址");
console.log("   - 轮数变量=KSROUNDS (当前: " + TOTAL_ROUNDS + ", 默认100)");
console.log("   - 金币上限变量=KSCOIN_LIMIT (当前: " + COIN_LIMIT + ", 默认100000)");
console.log("   - 低奖励阈值变量=KSLOW_REWARD_THRESHOLD (当前: " + LOW_REWARD_THRESHOLD + ", 默认10)");
console.log("   - 连续低奖励上限变量=KSLOW_REWARD_LIMIT (当前: " + LOW_REWARD_MAX_TIMES + ", 默认3)");
console.log("   - 并发数变量=MAX_CONCURRENCY (当前: " + CONCURRENCY + ", 默认10, 最大200)");
console.log("🌾 养号配置:");
console.log("   - 养号开关: " + (FARM_CONFIG.ENABLE_FARM ? "✅ 已启用" : "❌ 已禁用"));
console.log("   - 低奖励阈值: " + FARM_CONFIG.LOW_REWARD_FARM_THRESHOLD + "金币");
console.log("   - 每个视频时长: " + FARM_CONFIG.SINGLE_VIDEO_WATCH_MIN + "-" + FARM_CONFIG.SINGLE_VIDEO_WATCH_MAX + "秒");
console.log("   - 刷视频总时长: " + FARM_CONFIG.FARM_VIDEO_TIME_MIN + "-" + FARM_CONFIG.FARM_VIDEO_TIME_MAX + "分钟");
console.log("   - 直播时长: " + FARM_CONFIG.LIVE_WATCH_TIME_MIN + "-" + FARM_CONFIG.LIVE_WATCH_TIME_MAX + "分钟");
console.log("   - 小游戏试玩: " + FARM_CONFIG.MINI_GAME_PLAY_MIN + "-" + FARM_CONFIG.MINI_GAME_PLAY_MAX + "分钟");
console.log("   - 商城浏览商品数: " + FARM_CONFIG.SHOP_BROWSE_ITEMS_MIN + "-" + FARM_CONFIG.SHOP_BROWSE_ITEMS_MAX + "个");
console.log("   - 每日养号上限: " + FARM_CONFIG.FARM_DAILY_LIMIT + "次");
console.log("🔧 DID更换功能：" + (ENABLE_DID_CHANGE ? "✅ 已启用 (ENABLE_DID_CHANGE=1)" : "❌ 已禁用 (设置 ENABLE_DID_CHANGE=1 启用)"));

if (ACCOUNT_COUNT > MAX_CONCURRENCY_ALLOW) {
  console.log("错误: 检测到 " + ACCOUNT_COUNT + " 个账号配置，最多只允许" + MAX_CONCURRENCY_ALLOW + "个");
  process.exit(1);
}

// 生成随机 DID
function generateAndroidDID() {
  try {
    const hex = "0123456789abcdef";
    let rand = "";
    for (let i = 0; i < 16; i++) {
      rand += hex.charAt(Math.floor(Math.random() * hex.length));
    }
    return "ANDROID_" + rand;
  } catch (e) {
    console.log("生成did失败: " + e.message);
    const fallback = Date.now().toString(16).toUpperCase();
    return "ANDROID_" + fallback.substring(0, 16);
  }
}

// 通用请求（带代理）
async function requestWrapper(options, proxyUrl = null, title = "Unknown Request") {
  const opt = { ...options };
  if (proxyUrl) {
    try {
      opt.agent = new SocksProxyAgent(proxyUrl);
    } catch (e) {
      console.log("[错误] " + title + " 代理URL无效(" + e.message + ")，尝试直连模式");
    }
  }

  return new Promise(resolve => {
    request(opt, (err, response, body) => {
      if (err) {
        return resolve({ response: null, body: null });
      }
      if (!response || response.statusCode !== 200) {
        return resolve({ response, body: null });
      }
      try {
        resolve({ response, body: JSON.parse(body) });
      } catch {
        resolve({ response, body });
      }
    });
  });
}

// 代理 IP 连通性检测
async function checkProxyConnect(proxyUrl, title = "代理检测") {
  if (!proxyUrl) {
    return { ok: true, msg: "✅ 未配置代理（直连模式）", ip: "localhost" };
  }
  const { response, body } = await requestWrapper({
    method: "GET",
    url: "https://ip9.com.cn/get",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    timeout: 8000
  }, proxyUrl, title + " → ip9.com.cn");

  if (!body) return { ok: false, msg: "❌ 无法通过代理访问 ip9.com.cn", ip: "" };

  let ip = "";
  if (typeof body === "string") {
    try {
      const j = JSON.parse(body);
      ip = j.ip || j.IP || j.addr || j.ip_address || j.query || (j.data && j.data.ip) || "";
    } catch {
      const match = body.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      ip = match ? match[0] : "";
    }
  } else if (body && typeof body === "object") {
    ip = body.ip || body.IP || body.addr || body.ip_address || body.query || (body.data && body.data.ip) || "";
  }

  return {
    ok: true,
    msg: "✅ SOCKS5代理正常，出口IP: " + (ip || "未知"),
    ip: ip || "未知"
  };
}

const usedIPSet = new Set();

// 获取账号基本信息
async function getAccountBasic(cookie, proxyUrl, tag) {
  const url = "https://encourage.kuaishou.com/rest/wd/encourage/account/basicInfo";
  const { response, body } = await requestWrapper({
    method: "GET",
    url,
    headers: {
      Host: "encourage.kuaishou.com",
      "User-Agent": "kwai-android aegon/3.56.0",
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    timeout: 12000
  }, proxyUrl, "账号[" + tag + "] 获取基本信息");

  if (body && body.result === 1 && body.data) {
    return {
      nickname: body.data.userData?.nickname || tag,
      totalCoin: body.data.coinAmount ?? null,
      allCash: body.data.cashAmountDisplay ?? null
    };
  }
  return null;
}

// 居中填充（表格用）
function padCenter(str, len) {
  str = String(str || "").substring(0, len);
  if (str.length >= len) return str;
  const totalPad = len - str.length;
  const left = Math.floor(totalPad / 2);
  return " ".repeat(left) + str + " ".repeat(totalPad - left);
}

// 账号任务执行器（增强版）
class AccountRunner {
  constructor({ index, salt, cookie, nickname = "", proxyUrl = null, tasksToExecute = [], remark = "" }) {
    this.index = index;
    this.salt = salt;
    this.cookie = cookie;
    this.nickname = nickname || remark || "账号" + index;
    this.remark = remark;
    this.proxyUrl = proxyUrl;
    this.coinLimit = COIN_LIMIT;
    this.coinExceeded = false;
    this.tasksToExecute = tasksToExecute;

    this.egid = "";
    this.did = "";
    this.userId = "";
    this.kuaishouApiSt = "";
    this.appver = "13.7.20.10468";
    this.parseCookieFields();

    this.headers = {
      Host: "nebula.kuaishou.com",
      "User-Agent": "kwai-android aegon/4.28.0",
      "Accept-Language": "zh-cn",
      kaw: "MDHkM+9FrbzVSEAqyw6KYWaDbX//YWh3HL3RNoTk0mflLjaw17zmC5Wgx5HS/kdo8uJyFtQMxCHt4jfkbu9FqpqmnO/5L67iloqkSzUuRt4OomU1jJGFzdZMalsksJeN75Aw0w+eS2PMus7fga6twyLPbI9Ku1xGWINrZFVxaFtQkweesxPN0tRRwfb98Vxi+sOIlaDxUM03svdfQpthP2HlXcOTkKBqV8bxwv8I5GCGZydEmtEA",
      kas: "0013db77e6dbe18ab159e21bc94e8cd224",
      Cookie: this.cookie,
      "Content-Type": "application/json"
    };

    this.taskReportPath = "/rest/r/ad/task/report";
    this.startTime = Date.now();
    this.endTime = this.startTime - 30000;
    this.queryParams = `mod=Xiaomi(MI 11)&appver=${this.appver}&egid=${this.egid}&did=${this.did}`;

    this.taskDef = {
      box: { name: "宝箱广告", businessId: 604, posId: 20347, subPageId: 100024063, pageId: 100011251, requestSceneType: 1, taskType: 1 },
      look: { name: "看广告得金币", businessId: 671, posId: 24068, subPageId: 100026368, pageId: 100011251, requestSceneType: 1, taskType: 1 },
      looks: { name: "看广告得金币[追加]", businessId: 671, posId: 24068, subPageId: 100026368, pageId: 100011251, requestSceneType: 7, taskType: 2 },
      food: { name: "看广告得金币1", businessId: 671, posId: 24068, subPageId: 100026368, pageId: 100011251, requestSceneType: 7, taskType: 2 }
    };

    this.taskStats = {};
    this.tasksToExecute.forEach(t => {
      if (this.taskDef[t]) this.taskStats[t] = { success: 0, failed: 0, totalReward: 0 };
    });

    this.lowRewardStreak = 0;
    this.lowRewardThreshold = LOW_REWARD_THRESHOLD;
    this.lowRewardLimit = LOW_REWARD_MAX_TIMES;
    this.stopAllTasks = false;
    this.taskLimitReached = {};
    this.tasksToExecute.forEach(t => {
      if (this.taskDef[t]) this.taskLimitReached[t] = false;
    });

    // 新增：养号计数
    this.farmCountToday = 0;
    this.totalRewardThisRun = 0;
    // 是否已执行过初始养号
    this.hasDoneInitialFarm = false;
  }

  parseCookieFields() {
    try {
      const egidMatch = this.cookie.match(/egid=([^;]+)/);
      const didMatch = this.cookie.match(/did=([^;]+)/);
      const uidMatch = this.cookie.match(/userId=([^;]+)/);
      const stMatch = this.cookie.match(/kuaishou\.api_st=([^;]+)/);
      const appverMatch = this.cookie.match(/appver=([^;]+)/);

      this.egid = egidMatch ? egidMatch[1] : "";
      this.did = didMatch ? didMatch[1] : "";
      this.userId = uidMatch ? uidMatch[1] : "";
      this.kuaishouApiSt = stMatch ? stMatch[1] : "";
      this.appver = appverMatch ? appverMatch[1] : "13.7.20.10468";

      if (!this.egid || !this.did) {
        console.log(`账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} cookie格式可能无 egid 或 did，但继续尝试...`);
      }
    } catch (e) {
      console.log(`账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 解析cookie失败: ${e.message}`);
    }
  }

  async checkCoinIsOverLimit() {
    try {
      const info = await getAccountBasic(this.cookie, this.proxyUrl, this.index);
      if (info && info.totalCoin != null) {
        const coin = parseInt(info.totalCoin);
        if (coin >= this.coinLimit) {
          console.log(`⚠️ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 金币已达 ${coin}，超过 ${this.coinLimit} 阈值，将停止任务`);
          this.coinExceeded = true;
          this.stopAllTasks = true;
          return true;
        }
      }
      return false;
    } catch (e) {
      console.log(`账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 金币检查异常: ${e.message}`);
      return false;
    }
  }

  // 新增：获取当前总金币的方法
  async getCurrentTotalCoin() {
    try {
      const info = await getAccountBasic(this.cookie, this.proxyUrl, this.index);
      if (info && info.totalCoin != null) {
        return parseInt(info.totalCoin);
      }
      return null;
    } catch (e) {
      console.log(`账号[${this.nickname}] 获取总金币失败: ${e.message}`);
      return null;
    }
  }

  async retry(fn, desc, maxRetries = 3, delayMs = 2000) {
    let attempt = 0;
    let lastErr = null;
    while (attempt < maxRetries) {
      try {
        const res = await fn();
        if (res) return res;
        lastErr = new Error(desc + " 返回空");
      } catch (e) {
        lastErr = e;
        console.log(`账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} ${desc} 异常: ${e.message}`);
      }
      attempt++;
      if (attempt < maxRetries) {
        console.log(`账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} ${desc} 失败，重试 ${attempt}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    console.log(`❌ ${desc} 最终失败`);
    return null;
  }

  async getEncSign(base64Data) {
    try {
      const { body } = await requestWrapper({
        method: "POST",
        url: SIGN_API_URL + "/encsign",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64Data }),
        timeout: 10000
      }, null, `账号[${this.nickname}] 加密签名`);

      if (body && body.status) return body.data;
      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} encsign 签名服务失败: ${body?.message || "无响应"}`);
      return null;
    } catch (e) {
      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} encsign 请求异常: ${e.message}`);
      return null;
    }
  }

  async getNsSig(urlPath, postData, apiSalt) {
    try {
      const payload = { path: urlPath, data: postData, salt: apiSalt };
      const { body } = await requestWrapper({
        method: "POST",
        url: SIGN_API_URL + "/nssig",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify(payload),
        timeout: 15000
      }, null, `账号[${this.nickname}] 签名服务`);

      if (body && body.data) {
        return {
          __NS_sig3: body.data.nssig3,
          __NStokensig: body.data.nstokensig,
          sig: body.data.sig,
          __NS_xfalcon: body.data.nssig4 || ""
        };
      }
      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} nssig 签名失败: ${body?.error || body?.message || "无响应"}`);
      return null;
    } catch (e) {
      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} nssig 请求异常: ${e.message}`);
      return null;
    }
  }

  async getAdInfo(taskCfg) {
    try {
      const apiPath = "/rest/e/reward/mixed/ad";
      const commonQuery = {
        encData: "|encData|",
        sign: "|sign|",
        cs: "false",
        client_key: "3c2cd3f3",
        videoModelCrowdTag: "1_23",
        os: "android",
        "kuaishou.api_st": this.kuaishouApiSt,
        uQaTag: "1##swLdgl:99#ecPp:-9#cmNt:-0#cmHs:-3#cmMnsl:-0"
      };
      const deviceQuery = {
        earphoneMode: "1",
        mod: "Xiaomi(23116PN5BC)",
        appver: this.appver,
        isp: "CUCC",
        language: "zh-cn",
        ud: this.userId,
        did_tag: "0",
        net: "WIFI",
        kcv: "1599",
        app: "0",
        kpf: "ANDROID_PHONE",
        ver: "11.6",
        android_os: "0",
        boardPlatform: "pineapple",
        kpn: "KUAISHOU",
        androidApiLevel: "35",
        country_code: "cn",
        sys: "ANDROID_15",
        sw: "1080",
        sh: "2400",
        abi: "arm64",
        userRecoBit: "0"
      };

      const impBody = {
        appInfo: { appId: "kuaishou", name: "快手", packageName: "com.smile.gifmaker", version: this.appver, versionCode: -1 },
        deviceInfo: { osType: 1, osVersion: "15", deviceId: this.did, screenSize: { width: 1080, height: 2249 }, ftt: "" },
        userInfo: { userId: this.userId, age: 0, gender: "" },
        impInfo: [{
          pageId: taskCfg.pageId,
          subPageId: taskCfg.subPageId,
          action: 0,
          browseType: 3,
          impExtData: "{}",
          mediaExtData: "{}"
        }]
      };

      const b64 = Buffer.from(JSON.stringify(impBody)).toString("base64");
      const encSign = await this.getEncSign(b64);
      if (!encSign) return null;

      commonQuery.encData = encSign.encdata;
      commonQuery.sign = encSign.sign;

      const qsDevice = querystring.stringify(deviceQuery);
      const qsCommon = querystring.stringify(commonQuery);
      const postData = qsDevice + "&" + qsCommon;

      const sigRes = await this.getNsSig(apiPath, postData, this.salt);
      if (!sigRes) return null;

      const fullQuery = { ...deviceQuery, sig: sigRes.sig, __NS_sig3: sigRes.__NS_sig3, __NS_xfalcon: sigRes.__NS_xfalcon, __NStokensig: sigRes.__NStokensig };
      const fullUrl = "https://api.e.kuaishou.com" + apiPath + "?" + querystring.stringify(fullQuery);

      const { body } = await requestWrapper({
        method: "POST",
        url: fullUrl,
        headers: {
          Host: "api.e.kuaishou.com",
          "User-Agent": "kwai-android aegon/3.56.0",
          Cookie: "kuaishou_api_st=" + this.kuaishouApiSt,
          kaw: this.headers.kaw,
          kas: this.headers.kas
        },
        form: commonQuery,
        timeout: 12000
      }, this.proxyUrl, `账号[${this.nickname}] 获取广告`);

      if (!body) return null;
      if (body.errorMsg === "OK" && body.feeds?.[0]?.ad) {
        const title = body.feeds[0].caption || body.feeds[0].ad?.caption || "";
        if (title) console.log(`✅ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 成功获取广告：${title}`);
        const expTag = body.feeds[0].exp_tag || "";
        const llsid = expTag.split("/")[1]?.split("_")?.[0] || "";
        return { cid: body.feeds[0].ad.creativeId, llsid, title };
      }
      return null;
    } catch (e) {
      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 获取广告异常: ${e.message}`);
      return null;
    }
  }

  async makeReportSign(cid, llsid, taskKey, taskCfg) {
    try {
      const bizJson = JSON.stringify({
        businessId: taskCfg.businessId,
        endTime: this.endTime,
        extParams: "",
        mediaScene: "video",
        neoInfos: [{
          creativeId: cid,
          extInfo: "",
          llsid: llsid,
          requestSceneType: taskCfg.requestSceneType,
          taskType: taskCfg.taskType,
          watchExpId: "",
          watchStage: 0
        }],
        pageId: taskCfg.pageId,
        posId: taskCfg.posId,
        reportType: 0,
        sessionId: "",
        startTime: this.startTime,
        subPageId: taskCfg.subPageId
      });

      const post = "bizStr=" + encodeURIComponent(bizJson) + "&cs=false&client_key=3c2cd3f3&kuaishou.api_st=" + this.kuaishouApiSt;
      const qsTotal = this.queryParams + "&" + post;

      const sig = await this.getNsSig(this.taskReportPath, qsTotal, this.salt);
      if (!sig) return null;

      return {
        sig: sig.sig,
        sig3: sig.__NS_sig3,
        sigtoken: sig.__NStokensig,
        xfalcon: sig.__NS_xfalcon,
        postData: post
      };
    } catch (e) {
      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 生成报告签名异常: ${e.message}`);
      return null;
    }
  }

  async submitReport(sig, sig3, sigToken, xfalcon, postData, taskKey, taskCfg) {
    try {
      const qs = this.queryParams +
        "&sig=" + sig +
        "&__NS_sig3=" + sig3 +
        "&__NS_xfalcon=" + (xfalcon || "") +
        "&__NStokensig=" + sigToken;

      const url = "https://api.e.kuaishou.com" + this.taskReportPath + "?" + qs;

      const { body } = await requestWrapper({
        method: "POST",
        url,
        headers: {
          Host: "api.e.kuaishou.cn",
          "User-Agent": "kwai-android aegon/3.56.0",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: postData,
        timeout: 12000
      }, this.proxyUrl, `账号[${this.nickname}] 提交任务`);

      if (!body) return { success: false, reward: 0 };
      if (body.result === 1) {
        const reward = body.data?.neoAmount || 0;

        // 获取当前总金币
        const currentTotalCoin = await this.getCurrentTotalCoin();
        const totalCoinDisplay = currentTotalCoin !== null ? ` | 当前总金币: ${currentTotalCoin}` : "";

        console.log(`💰 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} ${taskCfg.name} 获得 ${reward} 金币${totalCoinDisplay}`);

        // 累计奖励用于养号判断
        this.totalRewardThisRun += reward;

        // 低奖励触发养号（低于阈值直接触发养号，不刷金币）
        if (FARM_CONFIG.ENABLE_FARM && reward < FARM_CONFIG.LOW_REWARD_FARM_THRESHOLD && this.farmCountToday < FARM_CONFIG.FARM_DAILY_LIMIT) {
            console.log(`⚠️ 账号[${this.nickname}] 奖励 ${reward} 金币低于阈值 ${FARM_CONFIG.LOW_REWARD_FARM_THRESHOLD}，触发养号（跳过本次刷金币）`);
            this.farmCountToday++;
            await doFarming(this.nickname, `低奖励(${reward}金币)`);

            // 养号后重新获取总金币显示
            const afterFarmCoin = await this.getCurrentTotalCoin();
            if (afterFarmCoin !== null) {
              console.log(`📊 账号[${this.nickname}] 养号后总金币: ${afterFarmCoin}`);
            }

            // 养号后停止当前任务，返回成功但标记为已处理
            return { success: true, reward, farmed: true };
        }

        if (reward <= this.lowRewardThreshold) {
          this.lowRewardStreak++;
          if (ENABLE_DID_CHANGE) {
            this.did = generateAndroidDID();
            console.log(`⚠️ 账号[${this.nickname}] 奖励过低，已更换DID，连续低奖励：${this.lowRewardStreak}/${this.lowRewardLimit}`);
          } else {
            console.log(`⚠️ 账号[${this.nickname}] 奖励过低，连续低奖励：${this.lowRewardStreak}/${this.lowRewardLimit}`);
          }

          if (this.lowRewardStreak >= this.lowRewardLimit) {
            console.log(`🏁 账号[${this.nickname}] 连续低奖励超限，停止全部任务`);
            this.stopAllTasks = true;
            return { success: true, reward };
          }
          const waitMs = Math.floor(Math.random() * 10000) + 583000;
          console.log(`🔍 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} ==> 等待 ${Math.round(waitMs / 1000)}s`);
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          this.lowRewardStreak = 0;
        }
        return { success: true, reward };
      }

      if ([20107, 20108, 1003, 415].includes(body.result)) {
        console.log(`⚠️ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} ${taskCfg.name} 已达上限`);
        this.taskLimitReached[taskKey] = true;
        return { success: false, reward: 0 };
      }

      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} ${taskCfg.name} 失败 result=${body.result}`);
      return { success: false, reward: 0 };
    } catch (e) {
      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 提交任务异常: ${e.message}`);
      return { success: false, reward: 0 };
    }
  }

  async runSingleTask(taskKey) {
    const cfg = this.taskDef[taskKey];
    if (!cfg) return false;
    if (this.taskLimitReached[taskKey] || this.stopAllTasks) return false;

    try {
      const adInfo = await this.retry(() => this.getAdInfo(cfg), "获取广告 " + cfg.name, 3);
      if (!adInfo) {
        this.taskStats[taskKey].failed++;
        return false;
      }

      // 广告转化：点击广告进入页面模拟真人浏览
      if (adInfo.title) {
        console.log(`📢 账号[${this.nickname}] 广告标题: ${adInfo.title.substring(0, 100)}`);
        // 根据广告标题判断类型并执行转化
        let adType = "browse";
        if (adInfo.title.includes("小说") || adInfo.title.includes("阅读") || adInfo.title.includes("故事")) {
            adType = "novel";
            await simulateNovelReading(this.nickname);
        } else if (adInfo.title.includes("下载") || adInfo.title.includes("游戏") || adInfo.title.includes("APP") || adInfo.title.includes("应用")) {
            adType = "app";
            await simulateAppPlay(this.nickname, "推荐应用");
        } else if (adInfo.title.includes("直播")) {
            adType = "live";
            // 直播广告观看5-10分钟
            const shortWatchTime = Math.floor(Math.random() * 300000) + 300000;
            await randomDelay(shortWatchTime, shortWatchTime + 60000);
            console.log(`🎥 [${this.nickname}] 观看直播广告 ${Math.round(shortWatchTime/60000)}分钟`);
        } else {
            const browseTime = Math.floor(Math.random() * 30000) + 30000;
            console.log(`📄 [${this.nickname}] 浏览广告内容 ${Math.round(browseTime/1000)}秒...`);
            await randomDelay(browseTime, browseTime + 5000);
        }
      }

      const waitMs = Math.floor(Math.random() * 10000) + 38000;
      console.log(`🔍 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} ==> ${cfg.name} ${randomAdStatus()} ${Math.round(waitMs / 1000)}s`);
      await new Promise(r => setTimeout(r, waitMs));

      const sign = await this.retry(() => this.makeReportSign(adInfo.cid, adInfo.llsid, taskKey, cfg), "生成报告签名", 3);
      if (!sign) {
        this.taskStats[taskKey].failed++;
        return false;
      }

      const result = await this.retry(() => this.submitReport(sign.sig, sign.sig3, sign.sigtoken, sign.xfalcon, sign.postData, taskKey, cfg), "提交报告", 3);
      if (result?.success) {
        this.taskStats[taskKey].success++;
        this.taskStats[taskKey].totalReward += result.reward || 0;
        return true;
      }

      this.taskStats[taskKey].failed++;
      return false;
    } catch (e) {
      console.log(`❌ 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 任务异常(${taskKey}): ${e.message}`);
      this.taskStats[taskKey].failed++;
      return false;
    }
  }

  async runAllTasks() {
    const results = {};
    for (const t of this.tasksToExecute) {
      if (this.stopAllTasks) break;
      if (!this.taskDef[t]) continue;

      console.log(`🚀 账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 开始任务：${this.taskDef[t].name}`);
      results[t] = await this.runSingleTask(t);

      if (this.stopAllTasks) break;
      if (t !== this.tasksToExecute.at(-1)) {
        const wait = Math.floor(Math.random() * 8000) + 7000;
        console.log(`⏱ 账号[${this.nickname}] 任务间隔等待 ${Math.round(wait / 1000)}s`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    return results;
  }

  printStats() {
    console.log(`\n账号[${this.nickname}]${this.remark ? "（" + this.remark + "）" : ""} 任务统计:`);
    for (const [k, stat] of Object.entries(this.taskStats)) {
      const name = this.taskDef[k].name;
      console.log(`  ${name}: 成功${stat.success}次, 失败${stat.failed}次, 总奖励${stat.totalReward}金币`);
    }
    console.log(`🌾 养号统计: 今日已养号 ${this.farmCountToday}/${FARM_CONFIG.FARM_DAILY_LIMIT} 次`);
    console.log(`💰 本轮总奖励: ${this.totalRewardThisRun} 金币`);
  }

  getStats() {
    return this.taskStats;
  }
}

// 解析单行账号字符串（remark#cookie#salt#proxy 或简化格式）
function parseAccountLine(line) {
  const parts = String(line || "").trim().split("#");
  if (parts.length < 2) return null;

  let remark = "";
  let cookie = "";
  let salt = "";
  let proxy = null;

  if (parts.length === 2) {
    cookie = parts[0];
    salt = parts[1];
  } else if (parts.length === 3) {
    if (/socks5:\/\//i.test(parts[2])) {
      cookie = parts[0];
      salt = parts[1];
      proxy = parts[2];
    } else {
      remark = parts[0];
      cookie = parts[1];
      salt = parts[2];
    }
  } else if (parts.length >= 4) {
    remark = parts[0];
    cookie = parts[1];
    salt = parts.slice(2, -1).join("#");
    proxy = parts.at(-1);
  }

  cookie = cookie.replace("kpn=NEBULA", "kpn=KUAISHOU");

  if (proxy) {
    if (proxy.includes("|")) {
      const [host, port, user, pwd] = proxy.split("|");
      proxy = `socks5://${user}:${pwd}@${host}:${port}`;
    } else if (!/^socks5:\/\//i.test(proxy)) {
      console.log("⚠️ 代理非socks5，忽略：" + proxy);
      proxy = null;
    }
  }

  return { remark, salt, cookie, proxyUrl: proxy };
}

// 加载所有有效账号
function loadAllAccounts() {
  const lines = parseAllAccounts();
  const list = [];
  for (const line of lines) {
    const acc = parseAccountLine(line);
    if (acc) list.push(acc);
    else console.log("账号格式错误：" + line);
  }
  list.forEach((acc, i) => acc.index = i + 1);
  return list;
}

// 并发调度器
async function concurrentRun(items, concurrency, taskFn) {
  const results = new Array(items.length);
  let index = 0;

  const worker = async () => {
    while (true) {
      const i = index++;
      if (i >= items.length) return;
      try {
        results[i] = await taskFn(items[i], i);
      } catch (e) {
        console.log(`并发异常（账号${i + 1}）：${e.message}`);
        results[i] = null;
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// 单个账号完整执行流程
async function runAccount(account) {
  if (account.proxyUrl) {
    console.log(`账号[${account.index}]${account.remark ? "（" + account.remark + "）" : ""} 🔌 测试代理...`);
    const proxyCheck = await checkProxyConnect(account.proxyUrl, `账号[${account.index}]`);
    console.log("  - " + proxyCheck.msg);
    if (proxyCheck.ok && proxyCheck.ip && proxyCheck.ip !== "localhost") {
      if (usedIPSet.has(proxyCheck.ip)) {
        console.log("\n⚠️ 相同IP重复，退出防止风控：" + proxyCheck.ip);
        process.exit(1);
      }
      usedIPSet.add(proxyCheck.ip);
    }
  } else {
    console.log(`账号[${account.index}]${account.remark ? "（" + account.remark + "）" : ""} 直连模式`);
  }

  console.log(`账号[${account.index}]${account.remark ? "（" + account.remark + "）" : ""} 🔍 获取账号信息...`);
  const infoBefore = await getAccountBasic(account.cookie, account.proxyUrl, account.index);
  const nickname = infoBefore?.nickname || "账号" + account.index;

  if (infoBefore) {
    const coin = infoBefore.totalCoin ?? "未知";
    const cash = infoBefore.allCash ?? "未知";
    console.log(`账号[${nickname}]${account.remark ? "（" + account.remark + "）" : ""} ✅ 登录成功 | 金币: ${coin} | 余额: ${cash}`);
  } else {
    console.log(`账号[${nickname}]${account.remark ? "（" + account.remark + "）" : ""} ❌ 信息获取失败，继续执行`);
  }

  const runner = new AccountRunner({
    ...account,
    nickname,
    tasksToExecute: TASKS_TO_RUN
  });

  await runner.checkCoinIsOverLimit();
  if (runner.coinExceeded) {
    console.log(`账号[${nickname}] 金币已超限，不执行任务`);
    const infoAfter = await getAccountBasic(account.cookie, account.proxyUrl, account.index);
    return {
      index: account.index,
      remark: account.remark || "无备注",
      nickname,
      initialCoin: infoBefore?.totalCoin || 0,
      finalCoin: infoAfter?.totalCoin || 0,
      coinChange: (infoAfter?.totalCoin || 0) - (infoBefore?.totalCoin || 0),
      initialCash: infoBefore?.allCash || 0,
      finalCash: infoAfter?.allCash || 0,
      cashChange: (infoAfter?.allCash || 0) - (infoBefore?.allCash || 0),
      stats: runner.getStats(),
      coinLimitExceeded: true
    };
  }

  // 先执行一次初始养号
  if (FARM_CONFIG.ENABLE_FARM && runner.farmCountToday < FARM_CONFIG.FARM_DAILY_LIMIT) {
    console.log(`🌾 [${nickname}] 开始初始养号...`);
    runner.farmCountToday++;
    await doFarming(nickname, "初始养号");
    runner.hasDoneInitialFarm = true;
  }

  // 开始刷金币任务
  for (let round = 0; round < TOTAL_ROUNDS; round++) {
    // 检查是否已触发养号且达到上限
    if (runner.stopAllTasks) {
      console.log(`账号[${nickname}] 🏁 停止条件触发，退出循环`);
      break;
    }

    const wait = Math.floor(Math.random() * 8000) + 8000;
    const now = new Date();
    console.log(`账号[${nickname}] ⌛ 第${round + 1}轮，等待 ${Math.round(wait / 1000)}s=====>${now.toLocaleString()}`);
    await new Promise(r => setTimeout(r, wait));
    console.log(`账号[${nickname}] 🚀 第${round + 1}轮任务开始`);
    await runner.runAllTasks();

    if (runner.stopAllTasks) {
      console.log(`账号[${nickname}] 🏁 停止条件触发，退出循环`);
      break;
    }

    if (round < TOTAL_ROUNDS - 1) {
      const interval = Math.floor(Math.random() * 10000) + 100000;
      console.log(`账号[${nickname}] ⌛ 轮间等待 ${Math.round(interval / 1000)}s`);
      await new Promise(r => setTimeout(r, interval));
    }
  }

  const infoAfter = await getAccountBasic(account.cookie, account.proxyUrl, account.index);
  const coinBefore = infoBefore?.totalCoin || 0;
  const coinAfter = infoAfter?.totalCoin || 0;
  const cashBefore = infoBefore?.allCash || 0;
  const cashAfter = infoAfter?.allCash || 0;

  runner.printStats();

  return {
    index: account.index,
    remark: account.remark || "无备注",
    nickname,
    initialCoin: coinBefore,
    finalCoin: coinAfter,
    coinChange: coinAfter - coinBefore,
    initialCash: cashBefore,
    finalCash: cashAfter,
    cashChange: cashAfter - cashBefore,
    stats: runner.getStats(),
    coinLimitExceeded: runner.coinExceeded,
    farmCount: runner.farmCountToday
  };
}

// 结果汇总表格
function printSummary(results) {
  if (!results.length) {
    console.log("\n无结果可展示");
    return;
  }

  const totalInitCoin = results.reduce((sum, r) => sum + (Number(r.initialCoin) || 0), 0);
  const totalFinalCoin = results.reduce((sum, r) => sum + (Number(r.finalCoin) || 0), 0);
  const totalCoinDelta = totalFinalCoin - totalInitCoin;
  const totalInitCash = results.reduce((sum, r) => sum + (Number(r.initialCash) || 0), 0);
  const totalFinalCash = results.reduce((sum, r) => sum + (Number(r.finalCash) || 0), 0);
  const totalCashDelta = totalFinalCash - totalInitCash;
  const totalFarmCount = results.reduce((sum, r) => sum + (r.farmCount || 0), 0);

  let totalTask = 0, totalSucc = 0, totalReward = 0;
  results.forEach(r => {
    if (!r.stats) return;
    Object.values(r.stats).forEach(s => {
      totalTask += s.success + s.failed;
      totalSucc += s.success;
      totalReward += s.totalReward || 0;
    });
  });

  const succRate = totalTask > 0 ? ((totalSucc / totalTask) * 100).toFixed(1) : "0.0";
  const limitAccounts = results.filter(r => r.coinLimitExceeded).length;

  console.log("\n" + "=".repeat(80));
  console.log("|" + padCenter(" 快手任务执行结果汇总 ", 78) + "|");
  console.log("=".repeat(80));
  console.log(`| 总账号: ${results.length} | 超限账号: ${limitAccounts} | 总任务: ${totalTask} | 成功率: ${succRate}% |`);
  console.log(`| 金币变化: ${totalCoinDelta} | 总奖励: ${totalReward} | 余额变化: ${totalCashDelta.toFixed(2)} |`);
  console.log(`| 总养号次数: ${totalFarmCount} |`);
  console.log("-".repeat(80));

  const heads = ["序号", "备注", "昵称", "初始金币", "最终金币", "金币变化", "初始余额", "最终余额", "余额变化", "养号次数"];
  const widths = [6, 16, 16, 12, 12, 12, 12, 12, 12, 10];
  let headLine = "|";
  heads.forEach((h, i) => headLine += padCenter(h, widths[i]) + "|");
  console.log(headLine);

  let sepLine = "|";
  widths.forEach(w => sepLine += "-".repeat(w) + "|");
  console.log(sepLine);

  results.forEach(r => {
    const lineParts = [
      r.index,
      r.remark,
      (r.nickname || "-") + (r.coinLimitExceeded ? " ⚠️" : ""),
      r.initialCoin,
      r.finalCoin,
      r.coinChange >= 0 ? "+" + r.coinChange : r.coinChange,
      r.initialCash,
      r.finalCash,
      r.cashChange >= 0 ? "+" + r.cashChange.toFixed(2) : r.cashChange.toFixed(2),
      r.farmCount || 0
    ];

    let line = "|";
    lineParts.forEach((p, i) => line += padCenter(p, widths[i]) + "|");
    console.log(line);
  });

  console.log("=".repeat(80));
  console.log("|" + padCenter(" 执行完成 ", 78) + "|");
  console.log("=".repeat(80));
}

// 主入口
(async () => {
  const accounts = loadAllAccounts();
  console.log("有效账号数：" + accounts.length);
  if (accounts.length === 0) process.exit(1);

  const finalResults = [];
  await concurrentRun(accounts, CONCURRENCY, async acc => {
    console.log(`\n—— 🚀 开始账号[${acc.index}]${acc.remark ? "（" + acc.remark + "）" : ""} ——`);
    try {
      const res = await runAccount(acc);
      finalResults.push(res);
    } catch (e) {
      console.log(`账号[${acc.index}] 执行异常：${e.message}`);
      finalResults.push({
        index: acc.index,
        remark: acc.remark || "无备注",
        nickname: "账号" + acc.index,
        initialCoin: 0, finalCoin: 0, coinChange: 0,
        initialCash: 0, finalCash: 0, cashChange: 0,
        error: e.message,
        farmCount: 0
      });
    }
  });

  finalResults.sort((a, b) => a.index - b.index);
  console.log("\n✅ 全部任务执行完成");
  console.log("\n------------------------------------ 最终汇总 ------------------------------------");
  printSummary(finalResults);
})();

const finalEncryptTag = "jsjiami.com.v7";
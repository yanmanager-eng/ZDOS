/**
 * ZDOS Maintenance Mode switch
 * 僅供 index.html 入口閘道判斷：
 * true  → location.replace('./maintenance.html')
 * false → 正常 Boot Splash → Login → Home
 * maintenance.html 為獨立展示頁，不讀此開關、不反向跳轉。
 */
window.MAINTENANCE_MODE = true;

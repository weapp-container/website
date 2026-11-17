const {createShowcase}=require('./lib/bridge')
App({
  onLaunch(){
    const transport=typeof weappContainer==='undefined'?null:weappContainer
    const storage=typeof wx==='undefined'?null:{get:key=>wx.getStorageSync(key),set:(key,value)=>wx.setStorageSync(key,value)}
    this.showcase=createShowcase({transport,storage});this.showcase.ready()
  }
})

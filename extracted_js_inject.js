(function(){
if(window._starxInjected) return;
window._starxInjected=true;
var btn={innerHTML:'',style:{pointerEvents:'auto',bottom:'0px'}};
var toast={textContent:'',style:{display:'none',bottom:'0px'}};
var relayoutTimer=null;
function showToast(m,ms){
  try{
    if(window._starx&&window._starx.notifyStatus){
      window._starx.notifyStatus(String(m||''),ms||0);
      return;
    }
  }catch(e){}
  try{window._starx&&window._starx.log&&window._starx.log('status:'+m);}catch(e){}
}
function textOf(node){return ((node&&node.innerText)||node&&node.value||'').replace(/\s+/g,'').toLowerCase();}
function visible(node){
  if(!node) return false;
  var style=window.getComputedStyle?window.getComputedStyle(node):null;
  if(style&&(style.display==='none'||style.visibility==='hidden')) return false;
  return true;
}
function isSubmitLike(node){
  var text=textOf(node);
  return /提交|保存|确认|完成|下一题|交卷|submit|finish|next|save/.test(text);
}
function relayoutButton(){
  var base=96;
  try{
    var nodes=document.querySelectorAll('button,input[type=button],input[type=submit],.btnBlue,.submitBtn,.subNav,.answerSub,.nextBtn,.saveBtn,.btn_primary,.btn-primary,.mooc-btn,.submit,[role=button]');
    var viewportHeight=window.innerHeight||document.documentElement.clientHeight||0;
    for(var i=0;i<nodes.length;i++){
      var node=nodes[i];
      if(!visible(node) || !isSubmitLike(node)) continue;
      var rect=node.getBoundingClientRect();
      if(!rect || rect.bottom<=0 || rect.top>=viewportHeight) continue;
      if(rect.height<18 || rect.width<40) continue;
      var gap=Math.max(12, viewportHeight-rect.top+12);
      if(gap>base) base=Math.min(220, gap);
    }
  }catch(e){}
  btn.style.bottom=base+'px';
  toast.style.bottom=(base+60)+'px';
}
function scheduleRelayout(){
  if(relayoutTimer) clearTimeout(relayoutTimer);
  relayoutTimer=setTimeout(relayoutButton,80);
}
window.addEventListener('resize',scheduleRelayout,true);
window.addEventListener('scroll',scheduleRelayout,true);
try{
  new MutationObserver(scheduleRelayout).observe(document.documentElement||document.body,{childList:true,subtree:true,attributes:true});
}catch(e){}
function getAllDocs(){
  var docs=[document];
  try{
    var frames=document.querySelectorAll('iframe');
    for(var i=0;i<frames.length;i++){
      try{var fd=frames[i].contentDocument||frames[i].contentWindow.document;if(fd)docs.push(fd);}catch(e){}
    }
  }catch(e){}
  return docs;
}
var Q_SEL='.TiMu,.tiMu,.singleQuesId,[id^="question"],.questionLi,.Cy_TItle,.queBox,.mark_item,.questionItem,.exam-item,.pad_question,.subjectDet';
function getQuestions(){
  var items=[];
  var docs=getAllDocs();
  _starx.log('scanning '+docs.length+' document(s) for questions');
  for(var d=0;d<docs.length;d++){
    var doc=docs[d];if(!doc||!doc.querySelectorAll)continue;
    var timus=doc.querySelectorAll(Q_SEL);
    _starx.log('doc['+d+'] matched '+timus.length+' elements (url='+(doc.location?doc.location.href:'?')+')');
    for(var i=0;i<timus.length;i++){
      var timu=timus[i], q={el:timu,index:items.length};
      var te=timu.querySelector('.Zy_TItle .clearfix,.Zy_TItle,.mark_name,.stem,.mark_name_one,.q-title');
      q.title=te?te.innerText.trim():timu.innerText.substring(0,200).trim();
      if(!q.title||q.title.length<2)continue;
      var tt=q.title;
      if(tt.indexOf('\u5355\u9009')>=0) q.type='single';
      else if(tt.indexOf('\u591A\u9009')>=0) q.type='multi';
      else if(tt.indexOf('\u5224\u65AD')>=0) q.type='judge';
      else if(tt.indexOf('\u586B\u7A7A')>=0) q.type='fill';
      else if(tt.indexOf('\u7B80\u7B54')>=0||tt.indexOf('\u8BBA\u8FF0')>=0) q.type='essay';
      else q.type='single';
      q.options=[];
      var opts=timu.querySelectorAll('li.fl_l,li.clearfix,.answerBg,.option-item,.option_li,.radio_option,.checkbox_option');
      for(var j=0;j<opts.length;j++){
        var li=opts[j];
        q.options.push({el:li,inputEl:li.querySelector('input'),text:li.innerText.trim()});
      }
      q.textareas=timu.querySelectorAll('textarea,[contenteditable=true]');
      q.inputs=timu.querySelectorAll('input[type=text],input.inp-txt');
      items.push(q);
    }
  }
  return items;
}
function clickOpt(o){if(o.inputEl)o.inputEl.click();else{var a=o.el.querySelector('a,label');if(a)a.click();else o.el.click();}}
function setVal(el,v){if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}else{el.innerHTML=v;}}
function normalizeOptionText(t){return (t||'').replace(/^[A-Za-z][.、:：\s]\s*/,'').trim();}
function mapQuestionType(t){
  if(t==='single') return 0;
  if(t==='multi') return 1;
  if(t==='fill') return 2;
  if(t==='judge') return 3;
  if(t==='essay') return 4;
  return -1;
}
function queryStructuredAnswer(q){
  var opts=[];
  for(var i=0;i<q.options.length;i++){
    var text=normalizeOptionText(q.options[i].text);
    if(text) opts.push(text);
  }
  return _starx.queryAnswerWithOptions((q.title||'').trim(),mapQuestionType(q.type),opts.length?opts.join('|'):null);
}
function fill(q,ans){
  if(!ans) return;
  ans=ans.trim();
  if(q.type==='single'||q.type==='multi'){
    var letters=ans.replace(/[^A-Fa-f]/g,'').toUpperCase().split('');
    if(letters.length){
      var map=['A','B','C','D','E','F'];
      for(var i=0;i<letters.length;i++){var idx=map.indexOf(letters[i]);if(idx>=0&&idx<q.options.length)clickOpt(q.options[idx]);}
    }else{
      for(var i=0;i<q.options.length;i++){var optionText=normalizeOptionText(q.options[i].text);if(q.options[i].text.indexOf(ans)>=0||(optionText&&ans.indexOf(optionText)>=0))clickOpt(q.options[i]);}
    }
  }else if(q.type==='judge'){
    var isT=/^(\u5BF9|\u6B63\u786E|\u221A|true|T|\u662F|yes|Y|A)/i.test(ans);
    if(q.options.length>=2)clickOpt(q.options[isT?0:1]);
  }else if(q.type==='fill'){
    var parts=ans.split(/[|\uFF5C]/);
    var fields=q.inputs.length?q.inputs:q.textareas;
    for(var i=0;i<fields.length&&i<parts.length;i++)setVal(fields[i],parts[i].trim());
  }else if(q.type==='essay'){
    var f=q.textareas[0]||q.inputs[0]; if(f)setVal(f,ans);
  }
}
function doSearch(){
  scheduleRelayout();
  var qs=getQuestions();
  if(!qs.length){
    _starx.log('no questions found, will retry in 2s');
    showToast('\u9875\u9762\u8FD8\u6CA1\u52A0\u8F7D\u5B8C\uFF0C\u7A0D\u7B49',2000);
    setTimeout(function(){
      qs=getQuestions();
      if(!qs.length){showToast('\u6CA1\u68C0\u6D4B\u5230\u9898\u76EE\uFF0C\u5148\u6253\u5F00\u9898\u76EE\u9875\u518D\u8BD5',3000);btn.innerHTML='\u641C\u9898';btn.style.pointerEvents='auto';return;}
      runSearch(qs);
    },2000);
    return;
  }
  runSearch(qs);
}
function runSearch(qs){
  showToast('\u5171 '+qs.length+' \u9898\uFF0C\u641C\u7D22\u4E2D\u2026',5000);
  var done=0,found=0,total=qs.length;
  for(var i=0;i<qs.length;i++){
    (function(q,idx){
      setTimeout(function(){
        try{
          var ans=queryStructuredAnswer(q);
          if(ans&&ans.length>0){fill(q,ans);found++;q.el.style.borderLeft='2px solid #4caf72';}
          else{q.el.style.borderLeft='2px solid #d06a64';}
        }catch(e){_starx.log('err:'+e.message);q.el.style.borderLeft='2px solid #b0b6bd';}
        done++;
        if(done>=total){
          showToast('\u5DF2\u586B '+found+'/'+total,4000);
          btn.innerHTML='\u641C\u9898';btn.style.pointerEvents='auto';
        }
      },idx*800);
    })(qs[i],i);
  }
}
window.__starxHasSearchTarget=function(){try{return getQuestions().length?1:0;}catch(e){return 0;}};
window.__starxTriggerSearch=function(){btn.innerHTML='\u641C\u7D22\u4E2D\u2026';btn.style.pointerEvents='none';return doSearch();};
btn.onclick=window.__starxTriggerSearch;
setTimeout(relayoutButton,120);
_starx.log('StarX injected: '+location.href);
})();
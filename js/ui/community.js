// BAYONA — COMMUNITY · progreso real, FitCoins, referidos y recompensas
// La comunidad solo publica eventos que existen en el estado local.
// La tienda FitCoin desbloquea gemelos digitales; los productos físicos
// requieren comercio real separado.

import { S, on } from "../state.js";
import { FITCOIN_REWARDS } from "../community.js";
import { ITEMS } from "../data.js";
import { esc, fmtInt, fmtDate, t } from "../i18n.js";
import { $, el, BUILDERS, showModal, hideModal, toast, openSection } from "./shared.js";
import { currentSession } from "../sync/supabase.js";
import {
  loadCommunityFeed,publishCommunityPost,toggleCommunityReactionCloud,
  getOrCreateReferralCode,acceptReferralCode,myReferralStats,
} from "../sync/community.js";

BUILDERS.social = (body) => renderCommunity(body);

function renderCommunity(body){
  body=body||$("#drawer-body");
  body.textContent="";
  const summary=S.communitySummary();

  const hero=el("section","community-hero");
  hero.innerHTML=`
    <div>
      <small>${esc(t("community.hero.kicker"))}</small>
      <h3>${esc(t("community.hero.title"))}</h3>
      <p>${esc(t("community.hero.body"))}</p>
    </div>
    <div class="community-kpis">
      <article><small>${esc(t("community.kpi.fitcoins"))}</small><strong>${fmtInt(summary.fitcoins)}</strong></article>
      <article><small>${esc(t("community.kpi.posts"))}</small><strong>${fmtInt(summary.posts)}</strong></article>
      <article><small>${esc(t("community.kpi.redemptions"))}</small><strong>${fmtInt(summary.redemptions)}</strong></article>
      <article><small>${esc(t("community.kpi.referrals"))}</small><strong>${fmtInt(summary.referralsVerified)}</strong></article>
    </div>`;
  body.appendChild(hero);

  const actions=el("div","community-actions");
  const share=el("button","btn btn-primary",t("community.share"));
  share.onclick=()=>shareProgressModal(body);
  const armory=el("button","btn",t("community.store.openArmory"));
  armory.onclick=()=>openSection("armory");
  actions.append(share,armory);
  body.appendChild(actions);

  renderFeed(body);
  renderCloudFeed(body);
  renderRewards(body);
  renderPhysical(body);
  renderReferrals(body);
  renderLedger(body);
}

function renderFeed(body){
  body.appendChild(el("div","sec-label",t("community.feed.label")));
  const wrap=el("section","community-feed");
  const posts=(S.data.community?.posts||[]).slice().reverse();
  if(!posts.length){
    wrap.appendChild(el("div","community-empty",t("community.feed.empty")));
    body.appendChild(wrap);return;
  }
  for(const post of posts){
    const card=el("article","community-post");
    const head=el("div","community-post-head");
    head.append(
      el("span","pill gold",t(`community.post.${post.type}`)),
      el("span","community-verified",t("community.verified")),
      el("small","",fmtDate(post.at))
    );
    const main=el("div","community-post-main");
    main.appendChild(el("strong","",post.title));
    if(post.subtitle)main.appendChild(el("span","",post.subtitle));
    if(post.metric)main.appendChild(el("b","",post.metric));
    if(post.caption)main.appendChild(el("p","",post.caption));
    const reactions=el("div","community-reactions");
    [
      ["respect","community.reaction.respect"],
      ["fire","community.reaction.fire"],
      ["strong","community.reaction.strong"],
    ].forEach(([type,key])=>{
      const b=el("button",S.data.community?.reactions?.[post.id]===type?"active":"",t(key));
      b.type="button";
      b.onclick=()=>{
        S.toggleCommunityReaction(post.id,type);
        renderCommunity(body);
      };
      reactions.appendChild(b);
    });
    card.append(head,main,reactions);
    wrap.appendChild(card);
  }
  body.appendChild(wrap);
}

function renderCloudFeed(body){
  body.appendChild(el("div","sec-label",t("community.cloud.label")));
  const wrap=el("section","community-cloud");
  if(!currentSession()){
    wrap.appendChild(el("div","community-empty",t("community.cloud.login")));
    body.appendChild(wrap);return;
  }
  const loading=el("div","community-empty",t("community.cloud.loading"));
  wrap.appendChild(loading);
  body.appendChild(wrap);
  loadCommunityFeed(60).then((posts)=>{
    wrap.textContent="";
    if(!posts.length){
      wrap.appendChild(el("div","community-empty",t("community.cloud.empty")));
      return;
    }
    posts.forEach((post)=>{
      const card=el("article","community-cloud-post");
      const head=el("div","community-post-head");
      head.append(
        el("span","pill",t(`community.post.${post.type}`)),
        el("strong","community-author",post.mine?t("community.cloud.you"):post.author_name),
        el("span","community-verified",post.verification==="server_verified"?t("community.cloud.serverVerified"):t("community.cloud.clientRegistered")),
        el("small","",fmtDate(post.created_at))
      );
      const main=el("div","community-post-main");
      main.appendChild(el("strong","",post.title));
      if(post.subtitle)main.appendChild(el("span","",post.subtitle));
      if(post.metric)main.appendChild(el("b","",post.metric));
      if(post.caption)main.appendChild(el("p","",post.caption));

      const reactions=el("div","community-reactions");
      [
        ["respect","community.reaction.respect"],
        ["fire","community.reaction.fire"],
        ["strong","community.reaction.strong"],
      ].forEach(([type,key])=>{
        const count=post.reactionCounts?.[type]||0;
        const b=el("button",post.myReaction===type?"active":"",`${t(key)} · ${count}`);
        b.type="button";
        b.onclick=async()=>{
          try{
            await toggleCommunityReactionCloud(post.id,type);
            renderCommunity(body);
          }catch(e){
            toast(t("community.cloud.label"),e?.message||t("community.cloud.error"),"danger");
          }
        };
        reactions.appendChild(b);
      });
      card.append(head,main,reactions);
      wrap.appendChild(card);
    });
  }).catch(()=>{
    wrap.textContent="";
    wrap.appendChild(el("div","community-empty",t("community.cloud.error")));
  });
}

function shareProgressModal(body){
  const candidates=S.progressShareCandidates();
  const shared=new Set((S.data.community?.posts||[]).map((p)=>p.evidenceId));
  const available=candidates.filter((x)=>!shared.has(x.id));
  if(!available.length)return toast(t("community.share"),t("community.share.none"));
  const options=available.map((x)=>`<option value="${esc(x.id)}">${esc(x.title)} · ${esc(x.metric||x.subtitle||"")}</option>`).join("");
  showModal(`
    <div class="cine-tag">${esc(t("community.share.evidence"))}</div>
    <div class="cine-title" style="font-size:22px">${esc(t("community.share.title"))}</div>
    <label>${esc(t("community.share.evidence"))}<select id="community-candidate">${options}</select></label>
    <label>${esc(t("community.share.caption"))}<textarea id="community-caption" maxlength="280"></textarea></label>
    <button class="btn btn-primary btn-block" id="community-publish">${esc(t("community.share.publish"))}</button>`,()=>{
      $("#community-publish").onclick=async()=>{
        const out=S.createProgressPost($("#community-candidate").value,$("#community-caption").value);
        if(!out.ok)return toast(t("community.share"),t("community.share.none"),"danger");
        hideModal();
        if(currentSession()){
          try{
            await publishCommunityPost(out.post);
            toast(t("community.cloud.label"),t("community.cloud.published"));
          }catch{
            toast(t("community.cloud.label"),t("community.cloud.localSafe"),"danger");
          }
        }
        renderCommunity(body);
      };
    });
}

function renderRewards(body){
  body.appendChild(el("div","sec-label",t("community.store.label")));
  const intro=el("section","community-store-intro");
  intro.innerHTML=`<strong>${esc(t("community.store.label"))}</strong><span>${esc(t("community.store.body"))}</span><b>${fmtInt(S.fitCoinBalance())} ✦</b>`;
  body.appendChild(intro);

  const grid=el("section","community-store-grid");
  for(const reward of FITCOIN_REWARDS){
    const owned=S.isOwned(reward.itemId);
    const lacking=Math.max(0,reward.cost-S.fitCoinBalance());
    const item=S.item(reward.itemId);
    const card=el("article",owned?"community-reward owned":"community-reward");
    card.innerHTML=`
      <div class="community-reward-swatch" style="background:linear-gradient(135deg,${esc(item?.vis?.color||"#111")},${esc(item?.vis?.accent||"#F4A261")})"></div>
      <strong>${esc(reward.name)}</strong>
      <span>${esc(t("community.store.cost",{cost:fmtInt(reward.cost)}))}</span>`;
    const b=el("button",owned?"btn":"btn btn-primary",
      owned?t("community.store.owned"):lacking?t("community.store.need",{amount:fmtInt(lacking)}):t("community.store.redeem"));
    b.disabled=owned||lacking>0;
    b.onclick=()=>{
      const out=S.redeemFitCoinReward(reward.id);
      if(!out.ok)return toast(t("community.store.label"),t("community.error.redeem"),"danger");
      toast(t("community.store.redeemed"),out.reward.name,"gold");
      renderCommunity(body);
    };
    card.appendChild(b);
    grid.appendChild(card);
  }
  body.appendChild(grid);
}

function renderPhysical(body){
  body.appendChild(el("div","sec-label",t("community.store.physical")));
  const card=el("section","community-physical");
  card.appendChild(el("p","",t("community.store.physicalBody")));
  const list=el("div","community-physical-list");
  ITEMS.filter((x)=>x.physical).forEach((item)=>{
    const row=el("article","community-physical-item");
    row.append(
      el("span","pill",t("community.store.physicalTag")),
      el("strong","",item.name),
      el("small","",item.rarity)
    );
    list.appendChild(row);
  });
  card.appendChild(list);
  const b=el("button","btn btn-block",t("community.store.openArmory"));
  b.onclick=()=>openSection("armory");
  card.appendChild(b);
  body.appendChild(card);
}

async function shareReferral(code){
  const text=t("community.referral.shareText",{code});
  if(navigator.share){
    try{
      await navigator.share({text});
      S.recordReferralShare("web-share");
      return true;
    }catch(e){
      if(e?.name==="AbortError")return false;
    }
  }
  try{
    await navigator.clipboard.writeText(text);
    S.recordReferralShare("clipboard");
    toast(t("community.referral.label"),t("community.referral.copied"));
    return true;
  }catch{
    return false;
  }
}

function renderReferrals(body){
  body.appendChild(el("div","sec-label",t("community.referral.label")));
  let shareCode=S.referralCode();
  const sum=S.communitySummary();
  const card=el("section","community-referrals");
  card.appendChild(el("p","",t("community.referral.body")));

  const codeBox=el("div","community-referral-code");
  const codeStrong=el("strong","",shareCode);
  codeBox.append(el("small","",t("community.referral.code")),codeStrong);
  card.appendChild(codeBox);

  const stats=el("div","community-referral-stats");
  const sharedStrong=el("strong","",fmtInt(sum.referralsShared));
  const verifiedStrong=el("strong","",fmtInt(sum.referralsVerified));
  const sharedArticle=el("article","");
  sharedArticle.append(el("small","",t("community.referral.shared")),sharedStrong);
  const verifiedArticle=el("article","");
  verifiedArticle.append(el("small","",t("community.referral.verified")),verifiedStrong);
  stats.append(sharedArticle,verifiedArticle);
  card.appendChild(stats);

  const share=el("button","btn btn-primary btn-block",t("community.referral.share"));
  share.onclick=async()=>{
    const ok=await shareReferral(shareCode);
    if(!ok)toast(t("community.referral.label"),t("community.error.clipboard"),"danger");
    else renderCommunity(body);
  };
  card.appendChild(share);

  if(currentSession()){
    const accept=el("section","community-referral-accept");
    accept.append(
      el("strong","",t("community.referral.acceptTitle")),
      el("p","",t("community.referral.acceptBody"))
    );
    const input=el("input","");
    input.maxLength=24;
    input.placeholder=t("community.referral.acceptPlaceholder");
    const b=el("button","btn",t("community.referral.accept"));
    b.onclick=async()=>{
      try{
        const ok=await acceptReferralCode(input.value);
        toast(t("community.referral.label"),ok?t("community.referral.accepted"):t("community.referral.already"),ok?"gold":"");
        const fresh=await myReferralStats();
        verifiedStrong.textContent=fmtInt(fresh.verified);
      }catch{
        toast(t("community.referral.label"),t("community.referral.invalid"),"danger");
      }
    };
    accept.append(input,b);
    card.appendChild(accept);

    Promise.all([getOrCreateReferralCode(),myReferralStats()]).then(([code,cloud])=>{
      if(code){shareCode=code;codeStrong.textContent=code;}
      verifiedStrong.textContent=fmtInt(cloud.verified);
    }).catch(()=>{/* el fallback local sigue visible */});
  }

  body.appendChild(card);
}

function ledgerLabel(tx){
  if(tx.source==="legacy_balance"||tx.label==="fitcoin.opening")return t("community.ledger.opening");
  if(tx.source==="reward_redemption"||tx.label==="fitcoin.redemption"){
    const reward=FITCOIN_REWARDS.find((x)=>x.id===tx.reference);
    return t("community.ledger.redemption",{reward:reward?.name||tx.reference||""});
  }
  if(tx.label==="fitcoin.transaction")return t("community.ledger.transaction");
  return tx.label;
}

function renderLedger(body){
  body.appendChild(el("div","sec-label",t("community.ledger.label")));
  const card=el("section","community-ledger");
  const rows=S.fitCoinLedger().slice().reverse().slice(0,30);
  if(!rows.length)card.appendChild(el("div","community-empty",t("community.ledger.empty")));
  for(const tx of rows){
    const row=el("article","community-ledger-row");
    row.append(
      el("span",tx.amount>0?"positive":"negative",`${tx.amount>0?"+":""}${fmtInt(tx.amount)} ✦`),
      el("strong","",ledgerLabel(tx)),
      el("small","",fmtDate(tx.at)),
      el("b","",t("community.ledger.balance",{balance:fmtInt(tx.balanceAfter)}))
    );
    card.appendChild(row);
  }
  body.appendChild(card);
}

on("community",()=>{
  const drawer=$("#drawer");
  if(drawer?.classList.contains("open")&&drawer.dataset.section==="social")renderCommunity($("#drawer-body"));
});
on("wallet",()=>{
  const drawer=$("#drawer");
  if(drawer?.classList.contains("open")&&drawer.dataset.section==="social")renderCommunity($("#drawer-body"));
});

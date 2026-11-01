import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("PDD never navigates after failed persistence", () => {
  const content = source("app/pdd/page.tsx");
  const failure = content.indexOf("if (insertError)");
  const navigation = content.indexOf('router.push("/onboarding/pronto")');
  assert.ok(failure >= 0 && navigation > failure);
  assert.match(content.slice(failure, navigation), /return;/);
});

test("Radar retains the draft until a successful save", () => {
  const content = source("app/radar/page.tsx");
  assert.match(content, /rota29-radar-draft:/);
  assert.match(content, /if \(error\) \{/);
  assert.ok(content.indexOf("sessionStorage.removeItem(") > content.indexOf("if (error) {"));
});

test("Participant pages require church access", () => {
  for (const path of ["app/radar/page.tsx", "app/pdd/page.tsx", "app/radar/result/page.tsx"]) {
    assert.match(source(path), /rota29_pilot_access/, path);
  }
  assert.match(source("utils/supabase/middleware.ts"), /rota29_pilot_access/);
});

test("Church-created invitation never offers new church registration", () => {
  const page = source("app/igreja/page.tsx");
  const shared = source("app/igreja/InvitationShare.tsx");
  const start = source("app/start/page.tsx");
  const callback = source("app/auth/callback/route.ts");
  const context = source("utils/invitation-context.ts");
  assert.match(shared, /new URL\("\/igreja","https:\/\/rota29-piloto\.vercel\.app"\)/);
  assert.match(shared, /searchParams\.set\("convite",code\)/);
  assert.match(page, /if\(invitedCode\)return <InvitationJoin/);
  assert.match(page, /const incoming=getInvitationContext\(\)/);
  assert.match(page, /if\(getInvitationContext\(\)!==null\)/);
  assert.match(page, /name="novaIgreja"/);
  assert.match(page, /values\.novaIgreja/);
  assert.match(start, /const invitation = getInvitationContext\(\)/);
  assert.match(start, /if \(invitation !== null\)/);
  assert.match(start, /router\.replace\("\/igreja\?convite="/);
  assert.match(start, /const invite = getInvitationContext\(\)/);
  assert.match(callback, /target\.searchParams\.set\("convite",/);
  assert.match(context, /window\.sessionStorage\.setItem/);
  assert.match(context, /"INVALID"/);
});

test("Invite-specific screen only permits join, not creating an institution", () => {
  const invitePage = source("app/igreja/InvitationJoin.tsx");
  assert.match(invitePage, /Convite para participar/);
  assert.match(invitePage, /Solicitar vínculo com /);
  assert.doesNotMatch(invitePage, /pilot_register_church/);
  assert.match(invitePage, /pilot_join_church/);
});

test("PWA is installable on iPhone and allows readable zoom", () => {
  const manifest = JSON.parse(source("public/manifest.json"));
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons?.some(x => x.sizes === "192x192"));
  assert.doesNotMatch(source("app/layout.tsx"), /userScalable: false/);
});

test("iOS church form submits on tap without native validation", () => {
  const content = source("app/igreja/page.tsx");
  assert.match(content, /<form ref=\{formRef\} noValidate onSubmit=\{ev=>/);
  assert.match(content, /type="button" onClick=\{\(\)=>\{if\(formRef\.current\)void register\(formRef\.current\)/);
  for (const name of ["nome", "cidade", "estado", "pastor", "contato", "convidados", "aceite"]) {
    assert.match(content, new RegExp('"' + name + '",'), "Must validate " + name);
  }
  assert.match(content, /submitLockRef\.current=true/);
  assert.match(content, /setFieldError\(\{field,message\}\)/);
  assert.match(content, /element\.scrollIntoView\(/);
  assert.match(content, /element\.focus\(/);
  assert.match(content, /fetch\("\/api\/igreja\/cadastro"/);
  assert.match(content, /finally\{\s*submitLockRef\.current=false;/);
});

test("Church registration API is authenticated and keeps database authorization", () => {
  const route = source("app/api/igreja/cadastro/route.ts");
  assert.match(route, /db\.auth\.getUser\(\)/);
  assert.match(route, /if\(authError\|\|!user\)/);
  assert.match(route, /db\.rpc\("pilot_register_church"/);
  assert.match(route, /p_aceite:aceite/);
  assert.match(source("utils/supabase/middleware.ts"), /'\/api\/igreja\/cadastro'/);
});

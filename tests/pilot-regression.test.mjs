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

test("Institutional invitations preserve Google OAuth context", () => {
  assert.match(source("app/auth/callback/route.ts"), /searchParams\.set\("convite", invite\)/);
  assert.match(source("app/igreja/InvitationShare.tsx"), /searchParams\.set\("convite",code\)/);
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

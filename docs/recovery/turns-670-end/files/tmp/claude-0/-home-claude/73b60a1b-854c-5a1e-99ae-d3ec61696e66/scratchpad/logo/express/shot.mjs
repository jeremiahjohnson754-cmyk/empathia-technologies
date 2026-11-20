const { chromium } = await import('/home/claude/empathia-technologies/node_modules/playwright/index.mjs');
const O=process.argv[2]; const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.route(/fonts\.(googleapis|gstatic)/, r=>r.abort()); await p.goto('file://'+O+'/brand-kit.html'); await p.waitForTimeout(500);
const n=await p.locator('.slide').count(); for(let i=0;i<n;i++){ await p.locator('.slide').nth(i).screenshot({path:`${O}/s${i}.png`}); } await b.close(); console.log(n);

# Handing off a branch from an Android phone (Termux)

These commands put a verified branch from a Git bundle onto GitHub from an Android phone running Termux. They assume nothing else: no
computer, and no GitHub write access from Claude's workspace. Run them in order.

**What you need:**
- Termux, from F-Droid or GitHub (the Play Store build is outdated);
- the bundle file and its `.sha256` file, downloaded to the phone's Downloads folder;
- a GitHub **fine-grained personal access token** limited to the `empathia-technologies` repository with "Contents: read and write"
  (GitHub → Settings → Developer settings → Personal access tokens → Fine-grained). The token is your password for the push. Do not
  paste it anywhere else.

## 1. One-time setup

```sh
pkg update -y && pkg install -y git openssl-tool coreutils
termux-setup-storage            # allow storage access when Android asks; this creates ~/storage/downloads
git config --global user.name  "Jeremiah Johnson"
git config --global user.email "<the email you use on GitHub>"
git config --global credential.helper store     # remembers the token in ~/.git-credentials (Termux-private)
```

## 2. Verify the download

```sh
cd ~/storage/downloads
sha256sum -c empathia-restoration-sprint-0-1.bundle.sha256        # must print: OK
mkdir -p ~/work && cp empathia-restoration-sprint-0-1.bundle ~/work/ && cd ~/work
```

## 3. Bring the branch into your repository

If you already have the repository on the phone, start from step 3b.

```sh
# 3a. first time on this phone: clone your repository (enter your GitHub username, and the token as the password)
git clone https://github.com/<your-github-user>/empathia-technologies.git
cd empathia-technologies

# 3b. check that the bundle applies to your repository, then fetch its branch
git bundle verify ../empathia-restoration-sprint-0-1.bundle          # "... is okay"; it names main's commit as a prerequisite
git fetch ../empathia-restoration-sprint-0-1.bundle restoration/sprint-0-1:restoration/sprint-0-1
git log --oneline -3 restoration/sprint-0-1                           # the top commit must match the one given with the bundle
git log --oneline main..restoration/sprint-0-1                        # the new commits on the branch
```

## 4. Push the branch. `main` and the live sites do not change.

```sh
git push -u origin restoration/sprint-0-1
```

Render deploys only `main` (`render.yaml`: `branch: main`). Pushing this branch changes nothing that is live. GitHub Actions runs the
build and tests on it (`.github/workflows/ci.yml`); check the result on the repository's **Actions** tab.

## 5. Open a pull request

1. On github.com, open the repository. GitHub offers **Compare & pull request** for the new branch.
2. Base `main` ← compare `restoration/sprint-0-1`.
3. Read the description and the CI result before merging.

**Merging to `main` publishes the redesigned website and the demo fixes**, because both sites auto-deploy on commit.

## 6. Roll back, if a merge goes wrong

- **Fastest:** Render dashboard → the static site → **Deploys** → the previous deploy → **Rollback**.
- **In Git:** on the phone, `git revert -m 1 <merge-commit>` then `git push`. Render redeploys the reverted `main`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `sha256sum: WARNING: 1 computed checksum did NOT match` | The download is incomplete. Download it again. |
| `error: Repository lacks these prerequisite commits` | Your local `main` is older than `ea84222`. Run `git fetch origin && git checkout main && git pull`, then repeat step 3b. |
| `Authentication failed` | Use the token, not your GitHub password. Check that it covers this repository with Contents read and write. |
| `Permission denied` on `~/storage` | Run `termux-setup-storage` again and allow access. |

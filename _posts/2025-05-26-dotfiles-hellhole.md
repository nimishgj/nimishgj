---
layout: post
title: "My Journey into the dotfiles management hell hole"
date: 2025-05-26 12:00:00 +0530
tags: [linux, dotfiles]
---

I will take you through how i got from knowing nothing about dotfiles to scratching my head
to come up with a perfect way to manage my dotfiles

# The different Phases

These are the different phases i went through

## 0th step

When I first started programming/coding in 2024 I didn't know about dotfiles. Shit I
did'nt know about basic linux. I honestly didn't care about anything
When I installed arch i ran into lot of issues and lots of stack overflow discussions
I just added things into by `.bashrc` like the docs said and then came the struggle
when i switched from arch to another os, I spent days getting my machine to work with tools
as it used to before

## The manual phase

After this my college suggested to use oh my zsh and then i installed and used it
then i used powerlevel10k as well. Then i realized i would need to redo the setup
if i every decide to switch to another os or lose my fs.
Then as a programmer i did `git init` and then every time i made change to .dotfiles
i manually used to copy it to a repo and push it. But it was very tedious task.

## The stow phase

Then i switched fron vscode to nvim and started to use a lot of tools like tmux etc..
I did the same thing manually copy and paste, then i came across stow which changed a
lot, it's like you don't have to do anything, just commit and push your dotfiles often
and carry on with your life.

## The Nix phase

After stow, I kept looking at others dotfiles and most often i would see a folder named `Nix`
I googled nix in dotfils, Then i came across nix flakes, I set it up for my mac and moved my
brew to pkgs and then commit and push it, but i didn't like changing the usernames, system
variables in my flake file, I could just solve this with a simple script but is it really
worth my time no, But i still have my nix flake installed

## Regret Phase

I constantly look for better ways, Then i tried out home-manager which also uses nix under the
hood, but the same problem manging it is not as easy as stow. So I sat back and realized i don't
really don't want a prefect dotfiles managment i just needed to have something which would be
easy to manage and use which would work, I am okay to run some commands if i have to but it is
better than moving to home-manager so I curretnly use stow for my dotfiles management.

# Conclusion

Once you get into this hell hole of managing your dotfiles there is no going back.
You have have to accept it and live with it.

You can find my dotfiles [here](https://github.com/nimishgj/dotfiles)

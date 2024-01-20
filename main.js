import './style.css'

import { Octokit } from "octokit";

const ghApi = new Octokit({
    auth: import.meta.env.VITE_GH_ACCESS_TOKEN
})

function setLoading(loading) {
    let loadingEl = document.getElementById('loadingOverlay')
    if (loading) {
        loadingEl.classList.remove('hide')
        // gridEl.classList.add('hide')
    } else {
        loadingEl.classList.add('hide')
        // gridEl.classList.remove('hide')
    }
}

function renderRepos(repos) {
    const repoGridEl = document.getElementById('repoGrid')
    repoGridEl.innerHTML = ``    
    for (let repo of repos) {
        console.log(repo)
        let repoColEl = document.createElement('div')
        repoColEl.classList.add('col')
        repoColEl.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">${repo.name}</h5>
            <p class="card-text">${repo.description ?? "No description provided"}</p>
            <a href="${repo.html_url}" target="_blank" class="btn btn-primary">View Repository</a> 
            </div>
        <div class="card-footer">
            ${repo.topics.map(t => `<span class="badge bg-secondary">${t}</span>`).join('')}
            </div> 
        </div>`
        repoGridEl.appendChild(repoColEl)
        document.getElementById('repoGridSpinner')?.remove()
    }
}


async function renderSearchResults(username, page=1, perPage=10) {
    setLoading(true)
    let searchStr = document.getElementById('searchInput').value
    return ghApi.rest.search
    .repos({
      q: `in:name ${searchStr} user:${username} `,
      page,
      per_page: perPage
    })
    .then((res) => {
    if (!window.searchMode)
      renderRepoGrid(username, perPage, res.data)
    else renderRepos(res.data.items)
      setLoading(false)
      // Process the search results as needed
    })
    .catch((err) => console.log("Search error:", err))
}


async function renderUserRepos(username, page=1, perPage=10, searchResults=null) {
    if (searchResults) {
        window.searchMode = true
        renderRepos(searchResults.items)
        return;
    }
    setLoading(true)
    return ghApi.rest.repos.listForUser({
        username,
        per_page: perPage,
        page
    })
    .then((r) => {
        renderRepos(r.data)
        setLoading(false)
    })
    .catch((err) => {
        console.log("Fetch user repos error:", err)
    })
}

function setAvatarSrc(imageUrl) {
    document.getElementById('imgSpinner')?.remove()
    document.getElementById('avatarImg')?.remove()
    let avatarImgEl = document.createElement('img')
    avatarImgEl.id = 'avatarImg'
    avatarImgEl.classList.add('image-fluid')
    avatarImgEl.src = imageUrl
    document.getElementById('avatarContainer').appendChild(avatarImgEl)
}

function renderUserData(userData) {
    document.getElementById('userDetails').innerHTML = `
    <p>Bio: ${userData.bio ?? "No bio provided"}</p>
    <p>Location: ${userData.location ?? "No location provided"}</p>
    <a href="${userData.html_url}">${userData.html_url}</a>
    `
}

function initializePage(username) {
  document.getElementById('username').innerText = username
  let pageList = document.getElementById('perPageSelect')
  document.getElementById('itemsPerPageDropdown').addEventListener('click', (e) => {
    pageList.classList.toggle('hide')
    console.log("CLCICLCLCLC")
  })
  document.querySelectorAll('.dropdown-item')
    .forEach((el) => el.addEventListener('click', (e) => {
        pageList.classList.add('hide')
        console.log("CLICK")
        renderRepoGrid(username, parseInt(e.target.innerHTML))
    }))
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!e.target.value) window.location.reload()
    renderSearchResults(username)
  })
}

async function renderRepoGrid(username, pageSize=10, searchResults=null) {
    document.getElementById('itemsPerPageDropdown').innerHTML = `<b>${pageSize}</b> items/page`
     const { data: userData } = await ghApi.rest.users.getByUsername({
        username,
      });
      console.log(searchResults)
      const totalRepos = searchResults? searchResults.total_count:userData.public_repos;

      setAvatarSrc(userData.avatar_url)
      renderUserData(userData)
      const totalPages = Math.ceil(totalRepos / pageSize);

      function generatePaginationLinks(currentPage) {
        const paginationContainer = document.querySelector('.pagination');
        paginationContainer.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
          const li = document.createElement('li');
          li.classList.add('page-item');
          const link = document.createElement('a');
          link.classList.add('page-link');
          link.href = '#';
          link.textContent = i;

          if (i === currentPage) {
            li.classList.add('active');
          }

          link.addEventListener('click', function () {
            handlePageClick(i);
          });

          li.appendChild(link);
          paginationContainer.appendChild(li);
        }
      }

      function handlePageClick(page) {
        console.log('Page clicked:', page);
        
        if (window.searchMode) 
        renderSearchResults(username, page, pageSize)
        else renderUserRepos(username, page, pageSize, searchResults)
       
        generatePaginationLinks(page);
      }
      if (!window.searchMode)
      handlePageClick(1);
}


document.onreadystatechange = (e) => {
    if (document.readyState !== 'complete') return;
    document.getElementById('changeUsernameLink').addEventListener('click', () => {
        getUsernameAndRender(true)
    })
    getUsernameAndRender()
}

function getUsernameAndRender(change=false) {

    let ghUsername;
    if (!change)
        ghUsername = localStorage.getItem('fyleGhUsername')
    if (!ghUsername) ghUsername = prompt("Enter github username:")
    if (!ghUsername) ghUsername = 'aqueelahmedv'
    localStorage.setItem('fyleGhUsername', ghUsername)
    initializePage(ghUsername)
    renderRepoGrid(ghUsername)
}
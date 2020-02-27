(function() {
    // initial state
    const BASE_API_URL = 'https://api.themoviedb.org/3';
    const API_KEY = '2a2111f54cf7e12fd1580ff34ebc37fd';

    const state = {
        filterType: 'all',
        sort: 'vote_average.desc', // default sort type
        favouriteMovies: {}, // list of favourite movies
        movies: { // stored movies (just to prevent unusual request)
            results: [],
            total_results: 0,
        },
        isLoading: false, // a new bunch of movies are loading
    };

    // getting all the elements
    const searchFormEl = document.querySelector('.js-search-form');
    const contentTitleEl = document.querySelector('.js-content-title');
    const moviesCountEl = document.querySelector('.js-movies-count');
    const moviesListEl = document.querySelector('.js-movies-list');
    const dropdownEls = document.querySelectorAll('.js-dropdown');
    const listEls = document.querySelectorAll('.js-dropdown-list');
    const sortingEl = document.querySelector('.js-sorting');
    const filteringEl = document.querySelector('.js-filtering');

    // Adding event listeners
    searchFormEl.addEventListener('submit', onSubmit, this);
    moviesListEl.addEventListener('click', onMoviesClick, this);

    dropdownEls.forEach(element => {
        element.addEventListener('click', onToggleDropdown, this);
    });
    listEls.forEach(element => {
        element.addEventListener('click', onDropdownItemClick, this);
    });
    sortingEl.addEventListener('click', onSort, this);
    filteringEl.addEventListener('click', onFilter, this);

    // EVENT HANDLERS

    /**
     * Update the movie list title
     * @param text
     */
    function setTitle(text = 'All movies') {
        contentTitleEl.innerHTML = text;
    }

    /**
     * Filter elements (without additional request)
     * @param event
     */
    function onFilter(event) {
        const element = event.target;

        if (state.isLoading) {
            return false;
        }

        state.filterType = element.dataset.id;
        setTitle(element.innerHTML);

        // if filter was applied and results isn't empty
        if (state.filterType === 'fav') {
            const movies = state.movies.results.filter(movie => state.favouriteMovies[movie.id]);
            updateList({
                results: movies,
                total_results: state.movies.total_results,
            });
        } else {
            updateList(state.movies);
        }
    }

    /**
     * Sort items by popularity or by release date
     * @param event
     */
    function onSort(event) {
        const element = event.target;
        if (state.isLoading === false) {
            switch (element.dataset.id) {
                case 'desc':
                    state.sort = 'popularity.desc';
                    break;
                case 'new':
                    state.sort = 'release_date.desc';
                    break;
                default:
                    state.sort = 'popularity.asc';
            }
            getList();
        }
    }

    /**
     * Just open/close dropdown blocks
     * @param event
     */
    function onToggleDropdown(event) {
        const element = event && event.currentTarget.nextElementSibling;
        listEls.forEach(list => {
            if (list === element) {
                element.classList.toggle('is-active');
            } else {
                list.classList.remove('is-active');
            }
        });
    }

    /**
     * Handle dropdown item click
     * @param event
     */
    function onDropdownItemClick(event) {
        const element = event.target;
        const valueEl = element.parentNode.parentNode.querySelector('.js-dropdown');

        if (state.isLoading === false) {
            valueEl.innerHTML = element.innerHTML;
        }

        onToggleDropdown();
    }

    /**
     * Handle movie items click (delegation like)
     * Now it only for adding/removing favorites
     * @param event
     */
    function onMoviesClick(event) {
        const target = event.target;
        if (target.classList.contains('js-icon')) {
            target.classList.toggle('is-favourite');
            const id = target.dataset.id;
            if (state.favouriteMovies[id]) {
                delete state.favouriteMovies[id]
            } else {
                state.favouriteMovies[id] = true;
            }
        }
    }

    /**
     * Search by name
     * there is no suggestion form or live searching as I had no time to implement it
     * @param event
     */
    function onSubmit(event) {
        event.preventDefault();
        if (state.isLoading) {
            return false;
        }
        state.isLoading = true;
        const value = encodeURIComponent(event.currentTarget.elements[0].value);

        if (value.length === 0) {
            getList();
            return false;
        }
        setTitle(`Search results for '${value}'`);

        fetch(`${BASE_API_URL}/search/movie?api_key=${API_KEY}&query=${value}`)
            .then(response => {
                return response.json();
            })
            .then(data => {
                state.movies = data;
                updateList(data);
                state.isLoading = false;
            });
    }

    function addLeadingZero(num) {
        return `0${num}`.substr(-2);
    }
    function getDate() {
        const date = new Date().getTime() - 3 * 30 * 24 * 60 * 60 * 1000;
        const newDate = new Date(date);
        const month = addLeadingZero(newDate.getMonth() + 1);
        const day = addLeadingZero(newDate.getDay());
        return `${newDate.getFullYear()}-${month}-${day}`;
    }

    /**
     * Getting the movies list.
     */
    function getList() {
        setTitle();
        if (state.isLoading) {
            return false;
        }
        state.isLoading = true;
        // get all movies for last 3 months
        let url = `${BASE_API_URL}/discover/movie?api_key=${API_KEY}&release_date.gte=${getDate()}`;
        if (state.sort) {
            url += `&sort_by=${state.sort}`;
        }
        fetch(url)
            .then(response => {
                return response.json();
            })
            .then(data => {
                state.movies = data;
                updateList(data);
                state.isLoading = false;
            });
    }

    /**
     * Update the movies list after searching or sorting
     * @param data
     */
    function updateList(data) {
        moviesCountEl.innerHTML = `Showing ${data.results.length} of a total of ${data.total_results} movies`;
        if (data.results.length) {
            moviesListEl.innerHTML = data.results.map(result => {
                let year = (result.release_date || '').split('-')[0];
                if (year) {
                    year = `(${year})`;
                }
                const moviePage = `https://www.themoviedb.org/movie/${result.id}`;
                const isFavourite = state.favouriteMovies[result.id] ? 'is-favourite' : '';
                return `<article class="movie">
                        ${getImage(result.poster_path, result.title)}
                        <div class="movie__badge">${getScore(result.vote_average, result.vote_count)}</div>
                        <div class="movie__info">
                            <h1 class="movie__info-header">
                                <a class="movie__info-header_link" target="_blank" href="${moviePage}">${result.title}</a> ${year}
                            </h1>
                            ${result.overview}
                        </div>
                        <div class="movie__controls">
                            <a class="button button-secondary icon-hart" class="js-favourite">
                                <img src="./images/heart.svg" class="icon js-icon ${isFavourite}" data-id="${result.id}">
                            </a>
                            <a class="button" target="_blank" href="${moviePage}">More info</a>
                        </div>
                    </article>`;
            }).join('');
        } else {
            moviesListEl.innerHTML = '<h1>NO RESULTS</h1>';
        }
    }

    function getScore(vote_average, vote_count) {
        const m = 250;
        const C = 6;
        return Math.round((vote_count / (vote_count + m)) * vote_average + (m / (vote_count + m)) * C);
    }

    /**
     * Helper to build a movie image element
     * @param imageId
     * @param title
     * @returns {string}
     */
    function getImage(imageId, title) {
        if (imageId) {
            return `<img class="movie__image" src="https://image.tmdb.org/t/p/w500/${imageId}"
                        alt="${title}">`
        }
        return `<img class="movie__image" src="./images/no-image.jpg" alt="${title}">`;
    }

    // start the application
    getList();
}());
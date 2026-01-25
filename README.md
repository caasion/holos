<a id="readme-top"></a>

<!-- ABOUT THE PROJECT -->
## About The Project

![Holos Screen Shot][product-screenshot]

Holos is an [Obsidian](https://obsidian.md) plugin to make long-term planning much simpler. Instead of being stuck with rigid todo lists, you can plan what to do for each action item (i.e. a course or a fitness goal) over the long-term.

I've started to document my development of this plugin! Please see [devlog]!

### Built With
[![Svelte][Svelte.dev]][Svelte-url] [![Typescript][Typescript]][Typescript-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Rationale
I've found that planning on a day-to-day basis is often too restricting. After all, you can't always do everything in one day. Google Calendar is great for long-term planning, but it also isn't specific enough. There is too much clutter if you were to put down all your task in Google Calendar. After all, it is moreso for events.

I designed and developed this plugin as a hybrid between the two, which allows you to simutaneously plan a task across multiple days but also plan from day to day.

The advantage of the table format is two fold:

Looking down through a column allows you to see your tasks/plans for a day.
![Holos Column][column]

At the same time, it is conducive to long-term planning as you can plan what to do for one action item individually across columns. (An action item is a way to group together tasks based on a common objective that it contributes to, i.e. school, fitness, or family).
![Holos Row][row]

I don't intend this calendar format to replace daily planning or google calendar--rather, I want it to act as a bridge between the two, which is why I am working on daily notes integration and google calendar integration. Please see [roadmap]!

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## My Design Touches
I designed the plugin to be a flexible planner, knowing that goals and objectives change over time. There are many features to add, remove, extend action items as time goes on.

I also implemented some QoL features to make the planner more user friendly:
- Tab and shift-tab navigation
- Rename and change color of action items
- Easy date navigation through weeks

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

To compile the project, install npm:
  ```sh
  npm install npm@latest -g
  ```

To install:

1. Clone the repo
   ```sh
   git clone https://github.com/caasion/obsidian-holos
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Compile Project
    ```sh
    npm run dev
    ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Othneil Drew's Best Readme Template](https://github.com/othneildrew/Best-README-Template/tree/main)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[product-screenshot]: docs/sample.png
[row]: docs/row.jpg
[column]: docs/column.jpg
[devlog]: docs/devlog.md
[roadmap]: docs/roadmap.md

[Svelte.dev]: https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00
[Svelte-url]: https://svelte.dev/
[Typescript]: https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square
[Typescript-url]: https://typescriptlang.org

import React, { useState } from 'react';
import './Stories.css';

const environmentalStories = [
  {
    id: 1,
    title: "The Last Plastic Straw",
    summary: "A tale of a sea turtle who teaches children about the dangers of plastic pollution in the ocean.",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "Small changes like refusing plastic straws can make a big difference for marine life.",
    content: "Once upon a time, there lived a wise old sea turtle named Ollie. Ollie had swum in the ocean for over 100 years and had seen many changes to his beautiful home. The most troubling change was the increasing amount of plastic floating in the water. One day, Ollie met a young girl named Maya who was visiting the beach. Maya accidentally dropped her plastic straw into the ocean. Ollie carefully brought it back to her and showed her how plastic harms sea creatures. Maya was shocked and promised to never use plastic straws again. She went back to school and told all her friends about what she learned. Together, they started a 'No Straw Challenge' in their community and helped save many ocean animals."
  },
  {
    id: 2,
    title: "The Recycling Rangers",
    summary: "Four friends form a superhero team to teach their neighborhood about the power of recycling.",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "When we work together to recycle, we become environmental superheroes.",
    content: "In the town of Greenville lived four friends: Jamie, Kai, Zoe, and Miguel. They noticed that people were throwing everything into the trash, even things that could be recycled. The four friends decided to become the 'Recycling Rangers,' a team of superheroes dedicated to teaching people about recycling. Each ranger had a special power: Jamie could identify paper products, Kai was an expert on plastics, Zoe knew all about glass, and Miguel was the metal master. Together, they created recycling stations around town and taught everyone how to sort their waste. Soon, Greenville became the cleanest, greenest town in the country, all thanks to the Recycling Rangers and the community working together."
  },
  {
    id: 3,
    title: "The Tree Who Wished for Friends",
    summary: "A lonely tree learns about the importance of forests for our planet's health.",
    image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "Trees are the lungs of our planet and deserve our protection.",
    content: "In a field stood a single tree named Oliver. Oliver was lonely and wished for friends. Every day, he watched as people passed by without noticing him. One spring day, a young boy named Leo stopped to rest under Oliver's shade. Leo noticed how hot it was in the field with only one tree. He learned in school that trees help cool the planet, clean the air, and provide homes for animals. Leo decided to plant more trees around Oliver. As the years passed, Leo's small saplings grew into strong trees. Oliver was no longer lonely, and the once-empty field became a beautiful forest where people came to enjoy nature. The air was cleaner, animals returned, and the whole area was cooler and more beautiful because of Leo's kindness."
  },
  {
    id: 4,
    title: "The Water Savers Club",
    summary: "Children in a drought-stricken town discover creative ways to conserve water.",
    image: "https://images.unsplash.com/photo-1527066579998-dbbae57f45ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "Every drop of water is precious, and we all must do our part to save it.",
    content: "The town of Sunnyville hadn't seen rain for months. The reservoir was getting lower every day, and everyone was worried. A group of friends—Aisha, Carlos, Emma, and Tyler—decided to start the 'Water Savers Club' at their school. They investigated how water was being wasted and came up with creative solutions. They fixed leaky faucets, installed rain barrels to collect the little rain that did fall, and taught people to take shorter showers. They even created a beautiful garden of drought-resistant plants that needed very little water. The whole town joined their efforts, and together they used so much less water that the reservoir lasted until the rainy season came. The mayor was so impressed that she made Water Savers Club an official part of the town's conservation program."
  },
  {
    id: 5,
    title: "The Compost Fairy",
    summary: "A magical fairy shows children how food scraps can transform into garden gold.",
    image: "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "Nature recycles everything, and we can help by composting our food waste.",
    content: "Lily didn't believe in fairies until she met Petal, the Compost Fairy. Petal was no bigger than Lily's thumb and had wings that shimmered like rainbows. Petal showed Lily the magic of composting—how banana peels, apple cores, and other food scraps could turn into rich soil. Together, they built a compost bin in Lily's backyard. Every day, Lily added fruit and vegetable scraps, and Petal worked her magic. In three months, the scraps had transformed into dark, rich soil that smelled like the earth after rain. Lily used this compost to grow the most beautiful and delicious vegetables in her garden. She shared her vegetables and her composting knowledge with neighbors, spreading Petal's magic throughout the community."
  },
  {
    id: 6,
    title: "The Energy Explorers",
    summary: "Two curious siblings discover renewable energy sources and help their town go green.",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "The sun, wind, and water can provide clean energy for a better future.",
    content: "Twins Sam and Alex were always curious about how things worked. When they learned about electricity in school, they wondered where it came from. Their investigation led them to discover that most electricity came from burning fuels that polluted the air. But they also learned about clean energy from the sun, wind, and water. With their parents' help, they built small models of solar panels, wind turbines, and water wheels. They took these to the science fair, where the mayor was so impressed that she decided to install solar panels on the town hall and a wind turbine at the community center. Sam and Alex's curiosity sparked a green energy revolution in their town, showing everyone that kids can make a big difference in protecting our planet."
  },
  {
    id: 7,
    title: "The Beach Cleanup Crew",
    summary: "A summer adventure turns into an important mission to save beach wildlife.",
    image: "https://images.unsplash.com/photo-1531256379416-9f000e90aacc?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "Beaches and oceans stay clean when we all take responsibility for our trash.",
    content: "Sofia looked forward to her beach vacation all year. But when she arrived, she was sad to see trash scattered across the beautiful sand. While building a sandcastle, she found a baby seagull tangled in plastic. With her parents' help, Sofia freed the bird. The next day, Sofia and her new beach friends—Jordan, Harper, and Dev—started the 'Beach Cleanup Crew.' Every morning before swimming, they spent 30 minutes picking up trash. Other kids and adults soon joined them. By the end of summer, their beach was the cleanest it had been in years, and local wildlife was thriving again. The town council put up signs inspired by the Beach Cleanup Crew, reminding everyone to keep the beach clean for all to enjoy."
  },
  {
    id: 8,
    title: "The Garden in the City",
    summary: "Urban children transform an abandoned lot into a vibrant community garden.",
    image: "https://images.unsplash.com/photo-1445052520430-32c8ebc92fe3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "Even in the busiest cities, we can create green spaces that help people and nature.",
    content: "In the middle of a busy city neighborhood, there was an empty lot filled with trash and weeds. Amir, Jasmine, and Luis walked past it every day on their way to school, wishing it could be something beautiful. One day, they decided to make a change. With permission from the city and help from their community, they cleared the trash and tested the soil. They planted vegetables, flowers, and even fruit trees. They added benches where people could sit and bird feeders to attract wildlife. Soon, the once-empty lot was full of life—butterflies, birds, and neighbors of all ages coming together to garden and enjoy nature. The garden provided fresh food for the community and became a cool, green oasis in the hot city. The children learned that with determination and teamwork, they could bring nature back to the city."
  },
  {
    id: 9,
    title: "The Forgotten Forest",
    summary: "Animals unite to protect their forest home from deforestation.",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "Forests are home to countless creatures and need our protection.",
    content: "Deep in the Forgotten Forest lived many animals who had watched their home grow smaller each year as humans cut down trees. Wise Owl called a meeting of all the forest creatures. 'We must help the humans understand why our forest matters,' she said. Each animal shared what the forest gave them: Squirrel had nuts and homes in tree trunks, Deer had plants to eat, Fox had places to hide, and Bee had flowers for honey. Together, they came up with a plan. When the logging trucks came again, the animals led a young girl named Rosa deep into the forest to see its wonders. Rosa was amazed by the animals, plants, and crystal-clear streams. She understood that the forest was a home that needed protection. Rosa told her parents, who were scientists, and they helped create a nature reserve where the forest and its animals could thrive forever."
  },
  {
    id: 10,
    title: "The Bicycle Revolution",
    summary: "A young boy starts a cycling movement that transforms his polluted city.",
    image: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    moral: "Bicycles are a clean, healthy, and fun way to reduce air pollution.",
    content: "Max lived in a city where the air was often gray with pollution from cars. He didn't like the smell or how it made his asthma worse. For his birthday, Max got a shiny red bicycle. He loved riding it to school and noticed he felt healthier breathing hard while pedaling than sitting in his parents' car breathing exhaust. Max convinced his friends to start riding bikes too. They called themselves the 'Pedal Power Patrol' and created a challenge: for one month, everyone would try to use bikes instead of cars for short trips. Max's parents, then his teachers, and even the mayor joined the challenge. The city added bike lanes to make cycling safer. After a year, there were so many more bicycles and so many fewer cars that the air became cleaner. Max could breathe better, and the whole city felt more alive with people enjoying the outdoors."
  }
];

const Stories = () => {
  const [selectedStory, setSelectedStory] = useState(null);
  
  const handleSelectStory = (story) => {
    setSelectedStory(story);
    window.scrollTo(0, 0);
  };
  
  const handleBack = () => {
    setSelectedStory(null);
    window.scrollTo(0, 0);
  };
  
  return (
    <div className="stories-container">
      <h1 className="stories-title">Environmental Stories for Kids</h1>
      <p className="stories-subtitle">
        Explore these fun stories about protecting our planet and learn how you can make a difference!
      </p>
      
      {selectedStory ? (
        <div className="story-detail">
          <button className="back-button" onClick={handleBack}>← Back to all stories</button>
          <div className="story-detail-content">
            <h2>{selectedStory.title}</h2>
            <img 
              src={selectedStory.image} 
              alt={selectedStory.title} 
              className="story-detail-image"
            />
            <div className="story-moral">
              <strong>Moral of the story:</strong> {selectedStory.moral}
            </div>
            <div className="story-full-content">
              {selectedStory.content}
            </div>
          </div>
        </div>
      ) : (
        <div className="stories-grid">
          {environmentalStories.map(story => (
            <div 
              key={story.id} 
              className="story-card"
              onClick={() => handleSelectStory(story)}
            >
              <div className="story-image-container">
                <img src={story.image} alt={story.title} className="story-image" />
              </div>
              <div className="story-info">
                <h3 className="story-title">{story.title}</h3>
                <p className="story-summary">{story.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Stories; 
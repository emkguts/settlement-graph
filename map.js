// Set up the dimensions and margins of the graph
const margin = {top: 50, right: 50, bottom: 50, left: 80};
const width = 1200 - margin.left - margin.right;
const height = 700 - margin.top - margin.bottom;

// Append the svg object to the body of the page
const svg = d3.select("#map")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Create a tooltip div
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background-color", "white")
  .style("border", "solid")
  .style("border-width", "1px")
  .style("border-radius", "5px")
  .style("padding", "10px")
  .style("pointer-events", "none");

  function extrapolateData(d, years) {
    const sortedYears = years.slice().sort((a, b) => a - b);
    
    // Find the earliest year with population data
    let firstDataYear = sortedYears.find(year => d[year] !== null);
    let firstPopulation = d[firstDataYear];
  
    // Create artificial data point for the establishment year
    if (d.Established < firstDataYear) {
      d[d.Established] = firstPopulation;
    }
  
    // Fill in missing years with the previous known value
    let lastKnownValue = firstPopulation;
    for (let year of sortedYears) {
      if (year >= d.Established) {
        if (d[year] === null) {
          d[year] = lastKnownValue;
        } else {
          lastKnownValue = d[year];
        }
      }
    }
  
    return d;
  }

// Remove or modify the getSettlementColor function
// function getSettlementColor(year) {
//   if (year >= 1996 && year <= 1999) return "orange";
//   if (year >= 2009 && year <= 2018) return "red";
//   return "grey";
// }

// Instead, use a single color for all settlements
const settlementColor = "steelblue";  // You can choose any color you prefer

// Parse the Data
d3.csv("settlements.csv").then(function(data) {
  // Convert string values to numbers and handle empty cells
  const years = [2018, 2017, 2016, 2015, 2010, 2005, 2003, 2000, 1999];
  data.forEach(d => {
    years.forEach(year => {
      d[year] = d[year] ? +d[year] : null;
    });
    d.Established = +d.Established;
    d = extrapolateData(d, years);
    console.log(d);
  });

  // Filter out settlements with no data
  data = data.filter(d => years.some(year => d[year] !== null));

  // Sort the data by the 'Established' year
  data.sort((a, b) => a.Established - b.Established);

  // Add X axis
  const x = d3.scaleLinear()
    .domain([d3.min(data, d => d.Established), 2018])
    .range([0, width]);
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
    .style("font-family", "Arial, sans-serif")
    .style("font-size", "16px");  // Increase font size for x-axis

  // Add Y axis
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d3.max(years.concat(d.Established), year => d[year] || 0))])
    .range([height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y))
    .style("font-family", "Arial, sans-serif")
    .style("font-size", "16px");  // Increase font size for y-axis

  // Prime Ministers data
  const primeMinisters = [
    { name: 'Eshkol', start: 1967, end: 1969 },
    { name: 'Meir', start: 1969, end: 1974 },
    { name: 'Rabin', start: 1974, end: 1977 },
    { name: 'Begin', start: 1977, end: 1983 },
    { name: 'Shamir', start: 1983, end: 1984 },
    { name: 'Peres', start: 1984, end: 1986 },
    { name: 'Shamir', start: 1986, end: 1992 },
    { name: 'Rabin', start: 1992, end: 1995 },
    { name: 'Peres', start: 1995, end: 1996 },
    { name: 'Netanyahu', start: 1996, end: 1999 },
    { name: 'Barak', start: 1999, end: 2001 },
    { name: 'Sharon', start: 2001, end: 2006 },
    { name: 'Olmert', start: 2006, end: 2009 },
    { name: 'Netanyahu', start: 2009, end: 2018 },
  ];

  // Remove the background colors for Prime Ministers
  // Instead, add vertical lines and labels for Prime Ministers' terms
  svg.selectAll(".pm-line")
    .data(primeMinisters)
    .enter()
    .append("line")
    .attr("class", "pm-line")
    .attr("x1", d => x(d.start))
    .attr("x2", d => x(d.start))
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5,5");

  // Add a variable to keep track of the currently selected PMs
  let selectedPMs = new Set();

  // Update the click functionality on PM labels
  svg.selectAll(".pm-label")
    .data(primeMinisters)
    .enter()
    .append("text")
    .attr("class", "pm-label")
    .attr("x", d => x(d.start) + (x(d.end) - x(d.start)) / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-family", "Arial, sans-serif")  // Change to sans-serif font
    .attr("transform", d => `rotate(-90 ${x(d.start) + (x(d.end) - x(d.start)) / 2} 20)`)
    .text(d => d.name)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      if (selectedPMs.has(d)) {
        // If clicking on an already selected PM, deselect it
        selectedPMs.delete(d);
        d3.select(this).style("fill", "black");
      } else {
        // Otherwise, add the PM to the selection
        selectedPMs.add(d);
        d3.select(this).style("fill", "red");
      }
      updateSettlementVisibility();
    });

  // Function to filter settlements
  function updateSettlementVisibility() {
    if (selectedPMs.size === 0) {
      showAllSettlements();
    } else {
      settlementGroups.style("display", d => {
        return Array.from(selectedPMs).some(pm => 
          d.Established >= pm.start && d.Established <= pm.end
        ) ? "inline" : "none";
      });
    }
  }

  // Function to show all settlements
  function showAllSettlements() {
    settlementGroups.style("display", "inline");
    svg.selectAll(".pm-label").style("fill", "black");
    selectedPMs.clear();
  }

  // Add a more prominent "Show All" button at the top
  svg.append("rect")
    .attr("class", "show-all-btn")
    .attr("x", width - 120)
    .attr("y", -margin.top + 10)  // Move to the top
    .attr("width", 100)
    .attr("height", 30)
    .attr("fill", "#4CAF50")
    .attr("rx", 5)
    .attr("ry", 5)
    .style("cursor", "pointer")
    .on("click", showAllSettlements);

  svg.append("text")
    .attr("class", "show-all-btn-text")
    .attr("x", width - 70)
    .attr("y", -margin.top + 30)  // Adjust text position
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", "14px")
    .attr("font-family", "Arial, sans-serif")  // Change to sans-serif font
    .text("Reset")
    .style("cursor", "pointer")
    .on("click", showAllSettlements);

  // Create line generator
  const line = d3.line()
    .defined(d => d.value !== null)
    .x(d => x(d.year))
    .y(d => y(d.value));

  // Create a group for each settlement
  const settlementGroups = svg.selectAll(".settlement")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "settlement");

  // Draw the lines
  settlementGroups.append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", settlementColor)  // Use the single color here
    .attr("stroke-width", 1.5)
    .attr("d", d => {
      const values = [d.Established, ...years]
        .filter(year => year >= d.Established)
        .sort((a, b) => a - b)
        .map(year => ({year: year, value: d[year]}))
        .filter(v => v.value !== null);
      return line(values);
    });

  // Add invisible thick stroke for better hover area
  settlementGroups.append("path")
    .attr("class", "line-hover")
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", 10)
    .attr("d", d => {
      const values = [d.Established, ...years]
        .filter(year => year >= d.Established)
        .sort((a, b) => a - b)
        .map(year => ({year: year, value: d[year]}))
        .filter(v => v.value !== null);
      return line(values);
    })
    .on("mouseover", function(event, d) {
      d3.select(this.parentNode).select(".line")
        .attr("stroke-width", 2.5)
        .attr("stroke", "red");  // Change color to blue on hover
      
      // Find the most recent population
      const mostRecentYear = years.find(year => d[year] !== null);
      const mostRecentPopulation = d[mostRecentYear];

      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`Settlement: ${d.Name}<br>Established: ${d.Established}<br>${mostRecentYear} Population: ${mostRecentPopulation.toLocaleString()}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
        .style("font-family", "Arial, sans-serif");  // Add sans-serif font
    })
    .on("mouseout", function(event, d) {
      d3.select(this.parentNode).select(".line")
        .attr("stroke-width", 1.5)
        .attr("stroke", settlementColor);  // Revert to the single color on mouseout
      
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  // Add x-axis label
  svg.append("text")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height + margin.bottom - 10)
    .attr("font-size", "16px")
    .attr("font-family", "Arial, sans-serif")  // Change to sans-serif font
    .text("Year");

  // Add y-axis label
  svg.append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 15)
    .attr("x", -margin.top + 40)
    .attr("font-family", "Arial, sans-serif")  // Change to sans-serif font
    .text("Population");

  // Add legend
  // const legend = svg.append("g")
  //   .attr("class", "legend")
  //   .attr("transform", `translate(${width - 200}, 20)`);

  // const legendData = [
  //   { color: settlementColor, label: "Settlements" }
  // ];

  // legendData.forEach((d, i) => {
  //   legend.append("line")
  //     .attr("x1", 0)
  //     .attr("y1", i * 20)
  //     .attr("x2", 20)
  //     .attr("y2", i * 20)
  //     .style("stroke", d.color);

  //   legend.append("text")
  //     .attr("x", 25)
  //     .attr("y", i * 20 + 5)
  //     .text(d.label);
  // });
});

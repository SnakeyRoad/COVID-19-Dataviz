// Cache-busting version: 1.0.0
// Main visualization script using D3.js
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const visualizationContainer = document.getElementById('visualization');
    const visualizationType = document.getElementById('visualization-type');
    const metricSelect = document.getElementById('metric-select');
    const continentFilter = document.getElementById('continent-filter');
    const tooltip = document.getElementById('tooltip');
    const insightsContent = document.getElementById('insights-content');
    
    // Check if we're on the visualization page
    if (!visualizationContainer) return;
    
    // Global variables
    let covidData = [];
    let currentVisualization = null;
    
    // Global tooltip positioning function
    function positionTooltip(event, tooltip, container) {
        const rect = container.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Get tooltip dimensions (if already visible)
        let tooltipWidth = tooltip.offsetWidth;
        let tooltipHeight = tooltip.offsetHeight;
        
        // If tooltip is not visible yet, show it offscreen to measure it
        if (tooltipWidth === 0) {
            tooltip.style.visibility = 'hidden';
            tooltip.style.display = 'block';
            tooltip.style.left = '-1000px';
            tooltip.style.top = '-1000px';
            tooltipWidth = tooltip.offsetWidth;
            tooltipHeight = tooltip.offsetHeight;
        }
        
        // Calculate position relative to the container
        let left = event.pageX - rect.left - scrollLeft + 10;
        let top = event.pageY - rect.top - scrollTop - 28;
        
        // Prevent tooltip from going off the right edge
        if (left + tooltipWidth > rect.width) {
            left = event.pageX - rect.left - scrollLeft - tooltipWidth - 10;
        }
        
        // Prevent tooltip from going off the bottom edge
        if (top + tooltipHeight > rect.height) {
            top = event.pageY - rect.top - scrollTop - tooltipHeight - 10;
        }
        
        // Ensure tooltip doesn't go off the left or top edges
        left = Math.max(left, 0);
        top = Math.max(top, 0);
        
        // Set the position
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.visibility = 'visible';
    }
    
    // Load the data
    d3.csv('data/covidstats.csv').then(function(data) {
        console.log("Data loaded successfully");
        // Process the data
        covidData = processData(data);
        
        // Initialize the default visualization
        updateVisualization();
        
        // Set up event listeners for controls
        visualizationType.addEventListener('change', updateVisualization);
        metricSelect.addEventListener('change', updateVisualization);
        continentFilter.addEventListener('change', updateVisualization);
    }).catch(function(error) {
        console.error('Error loading the data:', error);
        visualizationContainer.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Data</h3>
                <p>There was an error loading the COVID-19 data. Please check that the CSV file is in the correct location.</p>
                <p>Technical details: ${error.message}</p>
                <p>Please check the browser console (F12) for more details.</p>
            </div>
        `;
    });
    
    // Function to process the raw data
    function processData(rawData) {
        return rawData.map(d => ({
            entity: d.Entity,
            continent: d.Continent,
            latitude: +d.Latitude,
            longitude: +d.Longitude,
            temperature: +d['Average temperature per year'],
            hospitalBeds: +d['Hospital beds per 1000 people'],
            doctors: +d['Medical doctors per 1000 people'],
            gdpPerCapita: +d['GDP/Capita'],
            population: +d.Population,
            medianAge: +d['Median age'],
            over65: +d['Population aged 65 and over (%)'],
            date: d.Date ? new Date(d.Date) : null,
            dailyTests: +d['Daily tests'],
            cases: +d.Cases,
            deaths: +d.Deaths
        }));
    }
    
    // Function to update the current visualization
    function updateVisualization() {
        // Clear the existing visualization
        d3.select('#visualization').html('');
        
        // Get the selected visualization type and metric
        const vizType = visualizationType.value;
        const metric = metricSelect.value;
        const continent = continentFilter.value;
        
        // Filter data if continent filter is active
        let filteredData = covidData;
        if (continent !== 'all') {
            filteredData = covidData.filter(d => d.continent === continent);
        }
        
        // Update layout based on visualization type
        const vizWrapper = document.getElementById('viz-wrapper');
        if (vizType === 'healthcare-scatter') {
            vizWrapper.classList.add('healthcare-view');
            document.getElementById('data-insights-container').classList.add('healthcare-insights-top');
        } else {
            vizWrapper.classList.remove('healthcare-view');
            document.getElementById('data-insights-container').classList.remove('healthcare-insights-top');
        }
        
        // Create the selected visualization
        switch (vizType) {
            case 'world-map':
                createWorldMapVisualization(filteredData, metric);
                break;
            case 'healthcare-scatter':
                createHealthcareScatterplot(filteredData, metric);
                break;
            case 'age-analysis':
                createAgeAnalysisVisualization(filteredData, metric);
                break;
            case 'time-series':
                createTimeSeriesVisualization(filteredData, metric);
                break;
            default:
                createWorldMapVisualization(filteredData, metric);
        }
        
        // Update the insights panel
        updateInsights(vizType, metric, continent);
    }
    
    // Function to create a world map visualization
    function createWorldMapVisualization(data, metric) {
        const width = visualizationContainer.clientWidth;
        const height = 500;
        
        // Create SVG element
        const svg = d3.select('#visualization')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Create a group for the map
        const g = svg.append('g');
        
        // Add zoom functionality
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom);
        
        // Create a projection
        const projection = d3.geoNaturalEarth1()
            .scale(width / 2 / Math.PI)
            .translate([width / 2, height / 2]);
        
        // Create a path generator
        const path = d3.geoPath().projection(projection);
        
        // Define expanded country name mappings to fix USA and UK issues
        const countryNameMapping = {
            "United States of America": "United States",
            "Democratic Republic of the Congo": "Democratic Republic of Congo",
            "United Kingdom": "United Kingdom of Great Britain and Northern Ireland", // Fix for UK
            "UK": "United Kingdom of Great Britain and Northern Ireland", // Alternative name for UK
            "USA": "United States", // Alternative name for USA
            "U.S.A": "United States", // Alternative name for USA
            "U.S.": "United States", // Alternative name for USA
            "United States": "United States of America", // Map from CSV to GeoJSON
            "Russia": "Russian Federation",
            "Tanzania": "United Republic of Tanzania",
            "South Korea": "Korea, Republic of",
            "North Korea": "Korea, Democratic People's Republic of",
            "Czech Republic": "Czechia",
            "Macedonia": "North Macedonia",
            "Laos": "Lao People's Democratic Republic",
            "Syria": "Syrian Arab Republic",
            "Iran": "Iran (Islamic Republic of)",
            "Vietnam": "Viet Nam"
        };
        
        // Load world map data
        d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
            .then(function(worldData) {
                // Aggregate data by country
                const countryData = aggregateDataByCountry(data, metric);
                
                // Debug: Log all country names in the map data
                const mapCountries = worldData.features.map(f => f.properties.name);
                console.log("Countries in map data:", mapCountries);
                
                // Debug: Log USA data
                console.log("USA data in countryData:", countryData["United States"]);
                
                // Create a color scale with increased contrast
                const colorScale = createColorScale(countryData, metric);
                
                // Draw the map
                g.selectAll('path')
                    .data(worldData.features)
                    .enter()
                    .append('path')
                    .attr('d', path)
                    .attr('class', 'country')
                    .attr('fill', d => {
                        const countryName = d.properties.name;
                        
                        // Try to find the country data using the original name
                        let countryValue = countryData[countryName] ? countryData[countryName].value : null;
                        
                        // If not found, try the mapped name
                        if (!countryValue && countryNameMapping[countryName]) {
                            countryValue = countryData[countryNameMapping[countryName]] ? 
                                           countryData[countryNameMapping[countryName]].value : null;
                        }
                        
                        // If still not found, try to find a reverse mapping
                        if (!countryValue) {
                            for (const [mapKey, mapValue] of Object.entries(countryNameMapping)) {
                                if (mapValue === countryName && countryData[mapKey]) {
                                    countryValue = countryData[mapKey].value;
                                    break;
                                }
                            }
                        }
                        
                        return countryValue ? colorScale(countryValue) : '#e0e0e0';
                    })
                    .on('mouseover', function(event, d) {
                        const countryName = d.properties.name;
                        let countryInfo = countryData[countryName];
                        
                        // If not found, try the mapped name
                        if (!countryInfo && countryNameMapping[countryName]) {
                            countryInfo = countryData[countryNameMapping[countryName]];
                        }
                        
                        // If still not found, try to find a reverse mapping
                        if (!countryInfo) {
                            for (const [mapKey, mapValue] of Object.entries(countryNameMapping)) {
                                if (mapValue === countryName && countryData[mapKey]) {
                                    countryInfo = countryData[mapKey];
                                    break;
                                }
                            }
                        }
                        
                        // Show tooltip near mouse cursor
                        tooltip.style.display = 'block';
                        positionTooltip(event, tooltip, visualizationContainer);
                        
                        if (countryInfo) {
                            const formattedValue = d3.format(',')(Math.round(countryInfo.value));
                            tooltip.innerHTML = `
                                <strong>${countryName}</strong><br>
                                ${getMetricLabel(metric)}: ${formattedValue}<br>
                                Population: ${d3.format(',')(countryInfo.population)}<br>
                                GDP per Capita: ${d3.format(',')(countryInfo.gdpPerCapita)}
                            `;
                        } else {
                            tooltip.innerHTML = `<strong>${countryName}</strong><br>No data available`;
                        }
                        
                        // Highlight the country
                        d3.select(this).attr('fill', '#555');
                    })
                    .on('mouseout', function(event, d) {
                        // Hide tooltip
                        tooltip.style.display = 'none';
                        
                        // Reset country color
                        const countryName = d.properties.name;
                        let countryInfo = countryData[countryName];
                        
                        // If not found, try the mapped name
                        if (!countryInfo && countryNameMapping[countryName]) {
                            countryInfo = countryData[countryNameMapping[countryName]];
                        }
                        
                        // If still not found, try to find a reverse mapping
                        if (!countryInfo) {
                            for (const [mapKey, mapValue] of Object.entries(countryNameMapping)) {
                                if (mapValue === countryName && countryData[mapKey]) {
                                    countryInfo = countryData[mapKey];
                                    break;
                                }
                            }
                        }
                        
                        d3.select(this).attr('fill', countryInfo ? 
                            colorScale(countryInfo.value) : '#e0e0e0');
                    })
                    .on('click', function(event, d) {
                        const countryName = d.properties.name;
                        let countryInfo = countryData[countryName];
                        
                        // If not found, try the mapped name
                        if (!countryInfo && countryNameMapping[countryName]) {
                            countryInfo = countryData[countryNameMapping[countryName]];
                        }
                        
                        // If still not found, try to find a reverse mapping
                        if (!countryInfo) {
                            for (const [mapKey, mapValue] of Object.entries(countryNameMapping)) {
                                if (mapValue === countryName && countryData[mapKey]) {
                                    countryInfo = countryData[mapKey];
                                    break;
                                }
                            }
                        }
                        
                        if (countryInfo) {
                            const perCapita = (countryInfo.value / countryInfo.population * 1000000).toFixed(2);
                            insightsContent.innerHTML = `
                                <h4>${countryName} Details</h4>
                                <p><strong>${getMetricLabel(metric)}:</strong> ${d3.format(',')(countryInfo.value)}</p>
                                <p><strong>${getMetricLabel(metric)} per Million:</strong> ${perCapita}</p>
                                <p><strong>Population:</strong> ${d3.format(',')(countryInfo.population)}</p>
                                <p><strong>GDP per Capita:</strong> ${d3.format(',')(countryInfo.gdpPerCapita)}</p>
                                <p><strong>Hospital Beds per 1000:</strong> ${countryInfo.hospitalBeds.toFixed(2)}</p>
                                <p><strong>Doctors per 1000:</strong> ${countryInfo.doctors.toFixed(2)}</p>
                                <p><strong>Median Age:</strong> ${countryInfo.medianAge.toFixed(1)}</p>
                                <p><strong>Population over 65:</strong> ${countryInfo.over65.toFixed(1)}%</p>
                            `;
                        }
                    });
                
                // Add a legend
                createLegend(svg, colorScale, metric, width);
            })
            .catch(function(error) {
                console.error('Error loading the world map data:', error);
                visualizationContainer.innerHTML = `
                    <div class="error-message">
                        <h3>Error Loading Map Data</h3>
                        <p>There was an error loading the world map data.</p>
                        <p>Technical details: ${error.message}</p>
                    </div>
                `;
            });
    }
    
    // Function to create a healthcare resources scatterplot
    function createHealthcareScatterplot(data, metric) {
        const width = visualizationContainer.clientWidth;
        const height = 600;
        const margin = { top: 50, right: 180, bottom: 80, left: 100 }; // Increased right margin for legend
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        // Aggregate data by country
        const countryData = aggregateDataByCountry(data, metric);
        
        // Convert to array format for scatter plot
        const plotData = Object.values(countryData).filter(d => d.hospitalBeds > 0 && d.value > 0);
        
        // Create SVG element
        const svg = d3.select('#visualization')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Create a group for the plot
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(plotData, d => d.hospitalBeds) * 1.1])
            .range([0, innerWidth])
            .nice();
        
        // Use log scale for Y axis with better formatted ticks for more even spacing
        const yScale = d3.scaleLog()
            .domain([
                Math.max(1, d3.min(plotData, d => d.value) / 1.5),
                d3.max(plotData, d => d.value) * 1.2
            ])
            .range([innerHeight, 0])
            .nice();
        
        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(plotData, d => d.population)])
            .range([4, 20]);
        
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(Array.from(new Set(plotData.map(d => d.continent))));
        
        // Create axes with improved formatting and spacing
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => d.toFixed(1));
        
        // Modified Y-axis to use fewer, more evenly spaced ticks to prevent overlap
        const yAxis = d3.axisLeft(yScale)
            .ticks(6, (d) => {
                if (d >= 1000000) return (d / 1000000) + 'M';
                if (d >= 1000) return (d / 1000) + 'K';
                return d;
            });
        
        // Add grid lines
        g.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale)
                .tickSize(-innerHeight)
                .tickFormat('')
            )
            .attr('stroke-opacity', 0.1);
        
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale)
                .tickSize(-innerWidth)
                .tickFormat('')
            )
            .attr('stroke-opacity', 0.1);
        
        // Add axes
        g.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(xAxis)
            .selectAll('text')
            .attr('font-size', '12px');
        
        g.append('g')
            .call(yAxis)
            .selectAll('text')
            .attr('font-size', '12px');
        
        // Add axis labels
        g.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text('Hospital Beds per 1000 People');
        
        g.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text('COVID-19 Deaths');
        
        // Add dots
        g.selectAll('circle')
            .data(plotData)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.hospitalBeds))
            .attr('cy', d => yScale(d.value))
            .attr('r', d => radiusScale(d.population))
            .attr('fill', d => colorScale(d.continent))
            .attr('opacity', 0.7)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('mouseover', function(event, d) {
                // Show tooltip near mouse cursor
                tooltip.style.display = 'block';
                positionTooltip(event, tooltip, visualizationContainer);
                
                // Calculate per million for better comparison
                const perCapita = (d.value / d.population * 1000000).toFixed(2);
                
                tooltip.innerHTML = `
                    <strong>${d.entity}</strong><br>
                    ${getMetricLabel(metric)}: ${d3.format(',')(d.value)}<br>
                    ${getMetricLabel(metric)} per Million: ${perCapita}<br>
                    Hospital Beds per 1000: ${d.hospitalBeds.toFixed(2)}<br>
                    Population: ${d3.format(',')(d.population)}<br>
                    Continent: ${d.continent}
                `;
                
                // Highlight the dot
                d3.select(this)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 2)
                    .attr('r', radiusScale(d.population) + 2);
            })
            .on('mouseout', function(event, d) {
                // Hide tooltip
                tooltip.style.display = 'none';
                
                // Reset dot appearance
                d3.select(this)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1)
                    .attr('r', radiusScale(d.population));
            });
        
        // Improved legend with background and better positioning
        const legendPadding = 10;
        const legendItemHeight = 20;
        const legendWidth = 120;
        
        const legend = svg.append('g')
            .attr('transform', `translate(${width - legendWidth - 25}, ${margin.top + 10})`); // Adjusted position
        
        const continents = Array.from(new Set(plotData.map(d => d.continent)));
        
        // Add a background rectangle behind the legend for better visibility
        legend.append('rect')
            .attr('x', -5)
            .attr('y', -5)
            .attr('width', legendWidth + 10)
            .attr('height', (continents.length * legendItemHeight) + 10)
            .attr('fill', 'white')
            .attr('opacity', 0.8)
            .attr('stroke', '#ccc')
            .attr('stroke-width', 0.5)
            .attr('rx', 3);
        
        continents.forEach((continent, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * legendItemHeight})`);
            
            legendRow.append('circle')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', 6)
                .attr('fill', colorScale(continent));
            
            legendRow.append('text')
                .attr('x', legendPadding)
                .attr('y', 4)
                .attr('font-size', '11px') // Smaller text
                .text(continent);
        });
    }
    
    // Function to create time series visualization
    function createTimeSeriesVisualization(data, metric) {
        const width = visualizationContainer.clientWidth;
        const height = 600; // Increased from 500 to 600
        const margin = { top: 50, right: 200, bottom: 80, left: 90 }; // Increased right margin for legend
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        // Process data for time series
        const timeSeriesData = processTimeSeriesData(data, metric);
        
        // Select top countries by the metric for cleaner visualization
        const topCountries = selectTopCountries(timeSeriesData, 10);
        
        // Create SVG element
        const svg = d3.select('#visualization')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Create a group for the plot
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Find the range of dates in the data
        const dateExtent = d3.extent(data.filter(d => d.date), d => d.date);
        
        // Create scales
        const xScale = d3.scaleTime()
            .domain(dateExtent)
            .range([0, innerWidth]);
        
        // Use log scale for Y axis to better handle large variations
        let yScale;
        const minValue = d3.min(topCountries.flatMap(c => c.values), d => d.value);
        if (minValue <= 0) {
            // Regular linear scale if there are zero or negative values
            yScale = d3.scaleLinear()
                .domain([0, d3.max(topCountries.flatMap(c => c.values), d => d.value) * 1.1])
                .range([innerHeight, 0])
                .nice();
        } else {
            // Log scale if all values are positive
            yScale = d3.scaleLog()
                .domain([Math.max(1, minValue), d3.max(topCountries.flatMap(c => c.values), d => d.value) * 1.1])
                .range([innerHeight, 0])
                .nice();
        }
        
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(topCountries.map(d => d.country));
        
        // Create axes with improved formatting
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => {
                // Format date to show year and month
                return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            });
        
        const yAxis = d3.axisLeft(yScale)
            .ticks(10)
            .tickFormat(d => {
                if (d >= 1000000) return (d / 1000000) + 'M';
                if (d >= 1000) return (d / 1000) + 'K';
                return d;
            });
        
        g.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(xAxis)
            .selectAll('text')
            .attr('font-size', '12px')
            .attr('transform', 'rotate(-30)')
            .attr('text-anchor', 'end')
            .attr('dx', '-0.8em')
            .attr('dy', '0.15em');
        
        g.append('g')
            .call(yAxis)
            .selectAll('text')
            .attr('font-size', '12px');
        
        // Add a subtle grid for better readability
        g.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale)
                .tickSize(-innerHeight)
                .tickFormat('')
            )
            .attr('stroke-opacity', 0.1);
            
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale)
                .tickSize(-innerWidth)
                .tickFormat('')
            )
            .attr('stroke-opacity', 0.1);
        
        // Add axis labels
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 60) // Adjusted for rotated labels
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text('Date');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(getMetricLabel(metric));
        
        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .text(`${getMetricLabel(metric)} Over Time - Top 10 Countries`);
        
        // Create a line generator
        const lineGenerator = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);
        
        // Add lines for each country
        topCountries.forEach(country => {
            g.append('path')
                .datum(country.values)
                .attr('class', 'line')
                .attr('d', lineGenerator)
                .attr('fill', 'none')
                .attr('stroke', colorScale(country.country))
                .attr('stroke-width', 2)
                .attr('data-country', country.country);
        });
        
        // Add dots at data points with interactive hover
        topCountries.forEach(country => {
            g.selectAll(`.dot-${country.country.replace(/\s+/g, '-')}`)
                .data(country.values)
                .enter()
                .append('circle')
                .attr('class', `dot-${country.country.replace(/\s+/g, '-')}`)
                .attr('cx', d => xScale(d.date))
                .attr('cy', d => yScale(d.value))
                .attr('r', 3)
                .attr('fill', colorScale(country.country))
                .attr('stroke', '#fff')
                .attr('stroke-width', 1)
                .style('opacity', 0) // Initially hidden
                .on('mouseover', function(event, d) {
                    // Show tooltip near mouse cursor
                    tooltip.style.display = 'block';
                    positionTooltip(event, tooltip, visualizationContainer);
                    
                    tooltip.innerHTML = `
                        <strong>${country.country}</strong><br>
                        Date: ${d.date.toLocaleDateString()}<br>
                        ${getMetricLabel(metric)}: ${d3.format(',')(d.value)}
                    `;
                    
                    // Highlight the dot
                    d3.select(this)
                        .style('opacity', 1)
                        .attr('r', 5);
                    
                    // Highlight the corresponding line
                    g.selectAll('.line')
                        .style('opacity', 0.3);
                    
                    g.selectAll(`.line[data-country="${country.country}"]`)
                        .style('opacity', 1)
                        .attr('stroke-width', 3);
                })
                .on('mouseout', function(event, d) {
                    // Hide tooltip
                    tooltip.style.display = 'none';
                    
                    // Reset dot appearance
                    d3.select(this)
                        .style('opacity', 0)
                        .attr('r', 3);
                    
                    // Reset line appearance
                    g.selectAll('.line')
                        .style('opacity', 1)
                        .attr('stroke-width', 2);
                });
        });
        
        // Add a legend with scrollable container if needed
        const legendContainer = svg.append('g')
            .attr('transform', `translate(${width - 180}, 50)`);
        
        // Create legend rows with full country names
        topCountries.forEach((country, i) => {
            const legendRow = legendContainer.append('g')
                .attr('transform', `translate(0, ${i * 25})`)
                .style('cursor', 'pointer')
                .on('mouseover', function() {
                    // Highlight this country's line
                    g.selectAll('.line')
                        .style('opacity', 0.3);
                    
                    g.selectAll(`.line[data-country="${country.country}"]`)
                        .style('opacity', 1)
                        .attr('stroke-width', 3);
                    
                    // Show dots for this country
                    g.selectAll(`.dot-${country.country.replace(/\s+/g, '-')}`)
                        .style('opacity', 1);
                })
                .on('mouseout', function() {
                    // Reset appearance
                    g.selectAll('.line')
                        .style('opacity', 1)
                        .attr('stroke-width', 2);
                    
                    // Hide dots
                    g.selectAll(`.dot-${country.country.replace(/\s+/g, '-')}`)
                        .style('opacity', 0);
                })
                .on('click', function() {
                    // Show more detailed information in the insights panel
                    const countryDetail = timeSeriesData.find(d => d.country === country.country);
                    
                    if (countryDetail) {
                        const latestData = countryDetail.values[countryDetail.values.length - 1];
                        
                        insightsContent.innerHTML = `
                            <h4>${country.country} Details</h4>
                            <p><strong>Latest ${getMetricLabel(metric)}:</strong> ${d3.format(',')(latestData.value)}</p>
                            <p><strong>Population:</strong> ${d3.format(',')(countryDetail.population)}</p>
                            <p><strong>GDP per Capita:</strong> ${d3.format(',')(countryDetail.gdpPerCapita)}</p>
                            <p><strong>Hospital Beds per 1000:</strong> ${countryDetail.hospitalBeds.toFixed(2)}</p>
                            <p><strong>Doctors per 1000:</strong> ${countryDetail.doctors.toFixed(2)}</p>
                            <p><strong>Median Age:</strong> ${countryDetail.medianAge.toFixed(1)}</p>
                            <p><strong>Population over 65:</strong> ${countryDetail.over65.toFixed(1)}%</p>
                            <p><strong>Continent:</strong> ${countryDetail.continent}</p>
                        `;
                    }
                });
            
            legendRow.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', 20)
                .attr('y2', 0)
                .attr('stroke', colorScale(country.country))
                .attr('stroke-width', 2);
            
            legendRow.append('text')
                .attr('x', 25)
                .attr('y', 4)
                .text(country.country); // Show full country name
        });
    }
    
    // Function to create age demographics analysis visualization
    function createAgeAnalysisVisualization(data, metric) {
        const width = visualizationContainer.clientWidth;
        const height = 600;
        const margin = { top: 50, right: 180, bottom: 80, left: 100 }; // Increased right margin for legend
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        // Aggregate data by country
        const countryData = aggregateDataByCountry(data, metric);
        
        // Convert to array format for scatter plot
        const plotData = Object.values(countryData).filter(d => d.medianAge > 0 && d.value > 0);
        
        // Create SVG element
        const svg = d3.select('#visualization')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Create a group for the plot
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(plotData, d => d.medianAge) * 1.1])
            .range([0, innerWidth])
            .nice();
        
        // Use log scale for Y axis with better tick formatting
        const yScale = d3.scaleLog()
            .domain([
                Math.max(1, d3.min(plotData, d => d.value) / 1.5),
                d3.max(plotData, d => d.value) * 1.2
            ])
            .range([innerHeight, 0])
            .nice();
        
        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(plotData, d => d.population)])
            .range([4, 20]);
        
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(Array.from(new Set(plotData.map(d => d.continent))));
        
        // Create axes with improved formatting
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => d.toFixed(1));
        
        // Improved Y-axis with fewer ticks to avoid overlapping
        const yAxis = d3.axisLeft(yScale)
            .ticks(6, (d) => {
                if (d >= 1000000) return (d / 1000000) + 'M';
                if (d >= 1000) return (d / 1000) + 'K';
                return d;
            });
        
        // Add grid lines
        g.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale)
                .tickSize(-innerHeight)
                .tickFormat('')
            )
            .attr('stroke-opacity', 0.1);
        
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale)
                .tickSize(-innerWidth)
                .tickFormat('')
            )
            .attr('stroke-opacity', 0.1);
        
        // Add axes
        g.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(xAxis)
            .selectAll('text')
            .attr('font-size', '12px');
        
        g.append('g')
            .call(yAxis)
            .selectAll('text')
            .attr('font-size', '12px');
        
        // Add axis labels
        g.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text('Median Age');
        
        g.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text('COVID-19 Deaths');
        
        // Add dots
        g.selectAll('circle')
            .data(plotData)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.medianAge))
            .attr('cy', d => yScale(d.value))
            .attr('r', d => radiusScale(d.population))
            .attr('fill', d => colorScale(d.continent))
            .attr('opacity', 0.7)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('mouseover', function(event, d) {
                // Show tooltip near mouse cursor
                tooltip.style.display = 'block';
                positionTooltip(event, tooltip, visualizationContainer);
                
                // Calculate per million for better comparison
                const perCapita = (d.value / d.population * 1000000).toFixed(2);
                
                tooltip.innerHTML = `
                    <strong>${d.entity}</strong><br>
                    ${getMetricLabel(metric)}: ${d3.format(',')(d.value)}<br>
                    ${getMetricLabel(metric)} per Million: ${perCapita}<br>
                    Median Age: ${d.medianAge.toFixed(1)}<br>
                    Population over 65: ${d.over65.toFixed(1)}%<br>
                    Population: ${d3.format(',')(d.population)}<br>
                    Continent: ${d.continent}
                `;
                
                // Highlight the dot
                d3.select(this)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 2)
                    .attr('r', radiusScale(d.population) + 2);
            })
            .on('mouseout', function(event, d) {
                // Hide tooltip
                tooltip.style.display = 'none';
                
                // Reset dot appearance
                d3.select(this)
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1)
                    .attr('r', radiusScale(d.population));
            });
        
        // Add a compact legend
        const legendPadding = 10;
        const legendItemHeight = 20;
        const legendWidth = 120;
        
        const legend = svg.append('g')
            .attr('transform', `translate(${width - legendWidth - 25}, ${margin.top + 10})`); // Adjusted position
        
        const continents = Array.from(new Set(plotData.map(d => d.continent)));
        
        // Add a background rectangle behind the legend for better visibility
        legend.append('rect')
            .attr('x', -5)
            .attr('y', -5)
            .attr('width', legendWidth + 10)
            .attr('height', (continents.length * legendItemHeight) + 10)
            .attr('fill', 'white')
            .attr('opacity', 0.8)
            .attr('stroke', '#ccc')
            .attr('stroke-width', 0.5)
            .attr('rx', 3);
        
        continents.forEach((continent, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * legendItemHeight})`);
            
            legendRow.append('circle')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', 6)
                .attr('fill', colorScale(continent));
            
            legendRow.append('text')
                .attr('x', legendPadding)
                .attr('y', 4)
                .attr('font-size', '11px') // Smaller text
                .text(continent);
        });
    }
    
    // Helper Functions
    
    // Aggregate data by country
    function aggregateDataByCountry(data, metric) {
        const countryData = {};
        
        data.forEach(d => {
            if (!d.entity || d.entity === '') return;
            
            // For each country, keep the latest data point
            if (!countryData[d.entity] || 
                (d.date && countryData[d.entity].date && d.date > countryData[d.entity].date)) {
                
                let value = 0;
                switch (metric) {
                    case 'cases':
                        value = d.cases;
                        break;
                    case 'deaths':
                        value = d.deaths;
                        break;
                    case 'tests':
                        value = d.dailyTests;
                        break;
                    default:
                        value = d.cases;
                }
                
                countryData[d.entity] = {
                    entity: d.entity,
                    continent: d.continent,
                    latitude: d.latitude,
                    longitude: d.longitude,
                    temperature: d.temperature,
                    hospitalBeds: d.hospitalBeds,
                    doctors: d.doctors,
                    gdpPerCapita: d.gdpPerCapita,
                    population: d.population,
                    medianAge: d.medianAge,
                    over65: d.over65,
                    date: d.date,
                    value: value
                };
            }
        });
        
        return countryData;
    }
    
    // Process data for time series visualization
    function processTimeSeriesData(data, metric) {
        // Group data by country
        const groupedByCountry = {};
        
        data.forEach(d => {
            if (!d.entity || !d.date) return;
            
            if (!groupedByCountry[d.entity]) {
                groupedByCountry[d.entity] = {
                    country: d.entity,
                    continent: d.continent,
                    latitude: d.latitude,
                    longitude: d.longitude,
                    temperature: d.temperature,
                    hospitalBeds: d.hospitalBeds,
                    doctors: d.doctors,
                    gdpPerCapita: d.gdpPerCapita,
                    population: d.population,
                    medianAge: d.medianAge,
                    over65: d.over65,
                    values: []
                };
            }
            
            let value = 0;
            switch (metric) {
                case 'cases':
                    value = d.cases;
                    break;
                case 'deaths':
                    value = d.deaths;
                    break;
                case 'tests':
                    value = d.dailyTests;
                    break;
                default:
                    value = d.cases;
            }
            
            groupedByCountry[d.entity].values.push({
                date: d.date,
                value: value
            });
        });
        
        // Sort the values by date for each country
        Object.values(groupedByCountry).forEach(country => {
            country.values.sort((a, b) => a.date - b.date);
            
            // Calculate the sum of values for ranking
            country.totalValue = country.values.reduce((sum, d) => sum + d.value, 0);
        });
        
        return Object.values(groupedByCountry);
    }
    
    // Select top countries by metric for visualization
    function selectTopCountries(timeSeriesData, count) {
        // Filter out countries with insufficient data
        const validCountries = timeSeriesData.filter(country => 
            country.values.length > 5 && country.totalValue > 0);
        
        // Sort by total value and select top countries
        return validCountries
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, count);
    }
    
    // Create a color scale based on data and metric with increased contrast
    function createColorScale(data, metric) {
        const values = Object.values(data).map(d => d.value);
        
        // Use different color schemes based on the metric with increased contrast
        switch (metric) {
            case 'cases':
                return d3.scaleSequential()
                    .domain([0, d3.max(values)])
                    .interpolator(d3.interpolate('#f7fbff', '#08306b')); // Darker blue for better contrast
            case 'deaths':
                return d3.scaleSequential()
                    .domain([0, d3.max(values)])
                    .interpolator(d3.interpolate('#fff5f0', '#67000d')); // Darker red for better contrast
            case 'tests':
                return d3.scaleSequential()
                    .domain([0, d3.max(values)])
                    .interpolator(d3.interpolate('#f7fcf5', '#00441b')); // Darker green for better contrast
            default:
                return d3.scaleSequential()
                    .domain([0, d3.max(values)])
                    .interpolator(d3.interpolate('#f7fbff', '#08306b')); // Darker blue for better contrast
        }
    }
    
    // Create a legend for the map
    function createLegend(svg, colorScale, metric, width) {
        const legendWidth = 200;
        const legendHeight = 15;
        const legendX = width - legendWidth - 20;
        const legendY = 50;
        
        // Create a linear gradient for the legend
        const defs = svg.append('defs');
        
        const gradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');
        
        // Add color stops to the gradient
        const colorDomain = colorScale.domain();
        const numStops = 10;
        
        for (let i = 0; i < numStops; i++) {
            const offset = `${i * 100 / (numStops - 1)}%`;
            const value = colorDomain[0] + (i / (numStops - 1)) * (colorDomain[1] - colorDomain[0]);
            const color = colorScale(value);
            
            gradient.append('stop')
                .attr('offset', offset)
                .attr('stop-color', color);
        }
        
        // Add a rectangle with the gradient
        svg.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)');
        
        // Add a title to the legend
        svg.append('text')
            .attr('x', legendX)
            .attr('y', legendY - 10)
            .attr('font-size', '12px')
            .text(getMetricLabel(metric));
        
        // Add labels for the min and max values
        svg.append('text')
            .attr('x', legendX)
            .attr('y', legendY + legendHeight + 15)
            .attr('font-size', '10px')
            .text('0');
        
        svg.append('text')
            .attr('x', legendX + legendWidth)
            .attr('y', legendY + legendHeight + 15)
            .attr('font-size', '10px')
            .attr('text-anchor', 'end')
            .text(d3.format(',')(colorDomain[1]));
    }
    
    // Get a human-readable label for the selected metric
    function getMetricLabel(metric) {
        switch (metric) {
            case 'cases':
                return 'Confirmed Cases';
            case 'deaths':
                return 'COVID-19 Deaths';
            case 'tests':
                return 'Daily Tests';
            default:
                return 'Confirmed Cases';
        }
    }
    
    // Update insights panel based on visualization type and metric
    function updateInsights(vizType, metric, continent) {
        let insights = '';
        
        switch (vizType) {
            case 'world-map':
                insights = `
                    <h4>World Map Insights</h4>
                    <p>This map shows the global distribution of ${getMetricLabel(metric).toLowerCase()} across countries.</p>
                    <p>Hover over countries to see detailed information and click on a country to view more statistics.</p>
                    <p>Countries with darker shades indicate higher ${getMetricLabel(metric).toLowerCase()}.</p>
                    <p>Use the controls above to switch between different metrics or filter by continent.</p>
                `;
                break;
            case 'healthcare-scatter':
                insights = `
                    <h4>Healthcare Resources Analysis</h4>
                    <p>This scatter plot explores the relationship between hospital beds per 1000 people and ${getMetricLabel(metric).toLowerCase()}.</p>
                    <p>Each circle represents a country, with the size indicating population.</p>
                    <p>Colors represent different continents for easier comparison across regions.</p>
                    <p>Hover over circles for detailed information and click to view more statistics.</p>
                `;
                break;
            case 'age-analysis':
                insights = `
                    <h4>Age Demographics Analysis</h4>
                    <p>This visualization examines how a country's age demographics relate to ${getMetricLabel(metric).toLowerCase()}.</p>
                    <p>Countries with higher median ages tend to have older populations, which may impact COVID-19 outcomes.</p>
                    <p>Circle size represents population, and colors indicate continents.</p>
                    <p>Interact with the visualization to explore specific countries in detail.</p>
                `;
                break;
            case 'time-series':
                insights = `
                    <h4>Time Series Analysis</h4>
                    <p>This chart shows how ${getMetricLabel(metric).toLowerCase()} changed over time for the top 10 most impacted countries.</p>
                    <p>Hover over the lines to see detailed values for specific dates.</p>
                    <p>Use the legend to highlight specific countries and click to view more detailed statistics.</p>
                    <p>The visualization helps identify different patterns of COVID-19 spread and response across countries.</p>
                `;
                break;
            default:
                insights = `<p>Select a visualization type to see key insights.</p>`;
        }
        
        insightsContent.innerHTML = insights;
    }
}); // Close the DOMContentLoaded event listener

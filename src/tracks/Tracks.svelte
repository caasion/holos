<script lang="ts">

</script>

<div class="container">
	<h1>Manage Tracks</h1>
	<div class="card-container">
		<div class="card">
			<div class="card-header-container">
				<h2>Track 1</h2>
				<div class="card-data-container">
					<div>📜</div>
					<div>O</div>
				</div>
			</div>
			
			<p>Habit 1 <br> Habit 2 <br> Habit 3</p>
			<p>Task 1 <br> Task 2 <br> Task 3</p>
		</div>
		<div class="card">
			<div class="card-header-container">
				<h2>Track 1</h2>
				<div class="card-data-container">
					<div>📜</div>
					<div>O</div>
				</div>
			</div>
			
			<p>Habit 1 <br> Habit 2 <br> Habit 3</p>
			<p>Task 1 <br> Task 2 <br> Task 3</p>
		</div>
		<div class="card">
			<div class="card-header-container">
				<h2>Track 1</h2>
				<div class="card-data-container">
					<div>📜</div>
					<div>O</div>
				</div>
			</div>
			
			<p>Habit 1 <br> Habit 2 <br> Habit 3</p>
			<p>Task 1 <br> Task 2 <br> Task 3</p>
		</div>
	</div>
</div>

<style>
    .container {
        margin: 5%;
        max-height: 80vh;
    }

		.card-container {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			grid-template-rows: auto;
      grid-column-gap: 6px;
		}
	

		.card {
				border: 2px solid #acacac;
        border-style: solid;
        border-radius: 1rem;
        width: 100%;
        height: 100%;
        padding: 10px;
        margin: 0px 5px;
		}

		.card-header-container {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.card-data-container {
			display: flex;
		}
</style>
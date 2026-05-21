<?php

namespace App\Modules\Visitation\Repositories;

use App\Modules\Visitation\Models\VisitationItem;

class VisitationItemRepository
{
    public function create(array $data): VisitationItem
    {
        return VisitationItem::create($data);
    }

    public function findById(int $id): VisitationItem
    {
        return VisitationItem::findOrFail($id);
    }

    public function update(int $id, array $data): VisitationItem
    {
        $item = $this->findById($id);
        $item->update($data);

        return $item;
    }
}
